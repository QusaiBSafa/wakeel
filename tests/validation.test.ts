import { describe, it, expect } from 'vitest';
import {
  clean,
  validateOrder,
  productSchema,
  bookingSchema,
  updateBusinessSchema,
  createBusinessSchema,
  closureSchema,
  faqCreateSchema,
} from '@/lib/validation';
import { parsePriceToMinor, priceLabel, minorToInput } from '@/lib/money';

const week = (on = true) => Array.from({ length: 7 }, () => ({ on, ranges: [{ s: '09:00', e: '17:00' }] }));

describe('clean', () => {
  it('strips control chars, trims and caps', () => {
    expect(clean('  a\u0000b\u0007c  ', 10)).toBe('abc');
    expect(clean('abcdef', 3)).toBe('abc');
    expect(clean(null, 5)).toBe('');
    expect(clean('line1\nline2', 20)).toBe('line1\nline2');
  });
});

describe('order validation (same rules as before)', () => {
  it('requires a name', () => {
    expect(validateOrder({ name: ' ', phone: '0599123456' })).toEqual({ error: 'الرجاء إدخال الاسم.' });
  });
  it('requires a valid phone', () => {
    expect(validateOrder({ name: 'سامي', phone: 'abc' })).toEqual({ error: 'الرجاء إدخال رقم هاتف صحيح.' });
  });
  it('accepts and cleans a valid order', () => {
    expect(validateOrder({ name: ' سامي ', phone: '+970 599-123-456', description: 'x'.repeat(1200) })).toEqual({
      name: 'سامي',
      phone: '+970 599-123-456',
      description: 'x'.repeat(1000),
    });
  });
});

describe('prices', () => {
  it('parses to minor units', () => {
    expect(parsePriceToMinor('70')).toBe(7000);
    expect(parsePriceToMinor('12.5')).toBe(1250);
    expect(parsePriceToMinor('12,05')).toBe(1205);
    expect(parsePriceToMinor('٧٠')).toBe(7000);
    expect(parsePriceToMinor('0')).toBeNull();
    expect(parsePriceToMinor('-3')).toBeNull();
    expect(parsePriceToMinor('1.234')).toBeNull();
    expect(parsePriceToMinor('abc')).toBeNull();
  });
  it('formats', () => {
    expect(priceLabel(4500, 'ILS')).toBe('45 ₪');
    expect(minorToInput(1250)).toBe('12.5');
    expect(minorToInput(1205)).toBe('12.05');
  });
});

describe('product schema', () => {
  it('accepts a minimal product', () => {
    const r = productSchema.parse({ name: 'قص وسشوار', price: '70' });
    expect(r).toMatchObject({ name: 'قص وسشوار', price: 7000, currency: 'ILS', sku: '', description: '' });
  });
  it('rejects bad prices, long names and unknown currency', () => {
    expect(productSchema.safeParse({ name: 'x', price: '' }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'x', price: '0' }).success).toBe(false);
    expect(productSchema.safeParse({ name: '', price: '5' }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'x', price: '5', currency: 'EUR' }).success).toBe(false);
    expect(productSchema.parse({ name: 'x'.repeat(200), price: '5' }).name.length).toBe(80);
  });
  it('rejects unknown keys (no business id from the client)', () => {
    expect(productSchema.safeParse({ name: 'x', price: '5', businessId: 'abc' }).success).toBe(false);
  });
});

describe('booking schema', () => {
  it('accepts a normal week', () => {
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 30, bufferMinutes: 0, days: week() }).success).toBe(true);
  });
  it('enforces slot and buffer bounds', () => {
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 4, bufferMinutes: 0, days: week() }).success).toBe(false);
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 481, bufferMinutes: 0, days: week() }).success).toBe(false);
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 30, bufferMinutes: -1, days: week() }).success).toBe(false);
  });
  it('rejects overlapping ranges and bad times', () => {
    const days = week();
    days[0] = { on: true, ranges: [{ s: '09:00', e: '12:00' }, { s: '11:00', e: '13:00' }] };
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 30, bufferMinutes: 0, days }).success).toBe(false);
    days[0] = { on: true, ranges: [{ s: '25:00', e: '26:00' }] };
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 30, bufferMinutes: 0, days }).success).toBe(false);
  });
  it('needs exactly 7 days', () => {
    expect(bookingSchema.safeParse({ enabled: true, slotMinutes: 30, bufferMinutes: 0, days: week().slice(1) }).success).toBe(false);
  });
});

describe('business schemas', () => {
  it('requires a name on create', () => {
    expect(createBusinessSchema.safeParse({ name: '  ' }).success).toBe(false);
    expect(createBusinessSchema.parse({ name: 'صالون لمسة', category: 'salon' })).toMatchObject({ name: 'صالون لمسة', category: 'salon', phone: '' });
  });
  it('validates phone and urls', () => {
    expect(updateBusinessSchema.safeParse({ phone: 'abc' }).success).toBe(false);
    expect(updateBusinessSchema.safeParse({ phone: '0599 123 456' }).success).toBe(true);
    expect(updateBusinessSchema.safeParse({ mapUrl: 'maps.google.com' }).success).toBe(false);
    expect(updateBusinessSchema.safeParse({ mapUrl: 'https://maps.google.com/x' }).success).toBe(true);
    expect(updateBusinessSchema.safeParse({ socials: { website: 'javascript:alert(1)' } }).success).toBe(false);
  });
  it('strips control chars and caps the description', () => {
    expect(updateBusinessSchema.parse({ description: 'a\u0000b' + 'c'.repeat(600) }).description?.length).toBe(500);
  });
  it('rejects unknown fields such as owner ids', () => {
    expect(updateBusinessSchema.safeParse({ ownerUserId: 'user_x' }).success).toBe(false);
  });
});

describe('closures and faqs', () => {
  it('validates dates', () => {
    expect(closureSchema.safeParse({ date: '2026-10-31' }).success).toBe(true);
    expect(closureSchema.safeParse({ date: '31/10/2026' }).success).toBe(false);
    expect(closureSchema.safeParse({ date: '' }).success).toBe(false);
  });
  it('requires a question', () => {
    expect(faqCreateSchema.safeParse({ question: ' ' }).success).toBe(false);
    expect(faqCreateSchema.parse({ question: 'بتعملوا خصم للطلاب؟' })).toMatchObject({ answer: '' });
  });
});
