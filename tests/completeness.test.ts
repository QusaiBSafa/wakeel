import { describe, expect, it } from 'vitest';
import { completeness } from '../lib/completeness';

const empty = { name: '', description: '', address: '', mapUrl: '', phone: '', returnsPolicy: '', cancelPolicy: '', deliveryEnabled: false, areaCount: 0 };

describe('completeness', () => {
  it('a blank business only passes the delivery check (delivery is off)', () => {
    const c = completeness(empty);
    expect(c).toMatchObject({ done: 1, total: 7 });
    expect(c.missing).toEqual(['الاسم', 'الوصف', 'العنوان', 'رابط الخريطة', 'رقم الهاتف', 'سياسة الإرجاع أو الإلغاء']);
  });
  it('delivery on without areas is missing, with areas it passes', () => {
    expect(completeness({ ...empty, deliveryEnabled: true }).missing).toContain('مناطق التوصيل');
    expect(completeness({ ...empty, deliveryEnabled: true, areaCount: 2 }).missing).not.toContain('مناطق التوصيل');
  });
  it('either policy counts, whitespace does not', () => {
    expect(completeness({ ...empty, cancelPolicy: 'يمكن الإلغاء' }).missing).not.toContain('سياسة الإرجاع أو الإلغاء');
    expect(completeness({ ...empty, name: '   ' }).missing).toContain('الاسم');
  });
  it('all seven', () => {
    expect(completeness({ name: 'س', description: 'و', address: 'ع', mapUrl: 'https://x.co', phone: '1', returnsPolicy: 'ر', cancelPolicy: '', deliveryEnabled: true, areaCount: 1 })).toEqual({ done: 7, total: 7, missing: [] });
  });
});
