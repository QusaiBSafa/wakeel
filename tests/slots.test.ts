import { describe, it, expect } from 'vitest';
import { slotStarts, rangeError, weekSlotCount, fmt, hhmm, toMin, dayHours } from '@/lib/slots';

describe('slot generation', () => {
  it('fills a range with back-to-back slots', () => {
    const s = slotStarts({ on: true, ranges: [{ s: '10:00', e: '12:00' }] }, 30);
    expect(s.map(hhmm)).toEqual(['10:00', '10:30', '11:00', '11:30']);
  });

  it('adds the buffer between slots and drops a slot that would overrun', () => {
    const s = slotStarts({ on: true, ranges: [{ s: '10:00', e: '12:00' }] }, 30, 15);
    expect(s.map(hhmm)).toEqual(['10:00', '10:45', '11:30']);
  });

  it('handles several ranges in a day', () => {
    const s = slotStarts(
      { on: true, ranges: [{ s: '10:00', e: '11:00' }, { s: '16:00', e: '17:00' }] },
      60,
    );
    expect(s.map(hhmm)).toEqual(['10:00', '16:00']);
  });

  it('returns nothing for a closed day or a bad slot length', () => {
    expect(slotStarts({ on: false, ranges: [{ s: '10:00', e: '12:00' }] }, 30)).toEqual([]);
    expect(slotStarts({ on: true, ranges: [{ s: '10:00', e: '12:00' }] }, 0)).toEqual([]);
    expect(slotStarts({ on: true, ranges: [{ s: '10:00', e: '12:00' }] }, 481)).toEqual([]);
  });

  it('skips invalid and overlapping ranges', () => {
    const day = { on: true, ranges: [{ s: '10:00', e: '12:00' }, { s: '11:00', e: '13:00' }, { s: '14:00', e: '13:00' }] };
    expect(slotStarts(day, 60).map(hhmm)).toEqual(['10:00', '11:00']);
  });

  it('counts the week', () => {
    const open = { on: true, ranges: [{ s: '10:00', e: '14:00' }, { s: '16:00', e: '20:00' }] };
    const days = [open, open, open, open, open, open, { on: false, ranges: [{ s: '10:00', e: '14:00' }] }];
    expect(weekSlotCount(days, 30)).toBe(6 * 16);
  });
});

describe('range validation', () => {
  it('requires both ends', () => {
    expect(rangeError([{ s: '', e: '10:00' }], 0)).toBe('حدد وقت البداية والنهاية');
  });
  it('requires the end after the start', () => {
    expect(rangeError([{ s: '10:00', e: '10:00' }], 0)).toBe('وقت النهاية لازم يكون بعد البداية');
  });
  it('flags overlaps with earlier ranges only', () => {
    const r = [{ s: '10:00', e: '14:00' }, { s: '13:00', e: '15:00' }];
    expect(rangeError(r, 0)).toBe('');
    expect(rangeError(r, 1)).toBe('هالفترة متداخلة مع فترة ثانية');
  });
  it('allows touching ranges', () => {
    expect(rangeError([{ s: '10:00', e: '12:00' }, { s: '12:00', e: '13:00' }], 1)).toBe('');
  });
});

describe('formatting', () => {
  it('formats 12-hour Arabic labels', () => {
    expect(fmt(toMin('09:05'))).toBe('9:05 ص');
    expect(fmt(toMin('12:00'))).toBe('12:00 م');
    expect(fmt(toMin('00:30'))).toBe('12:30 ص');
    expect(fmt(toMin('20:00'))).toBe('8:00 م');
  });
  it('summarises a day', () => {
    expect(dayHours({ on: false, ranges: [] })).toBe('مغلق');
    expect(dayHours({ on: true, ranges: [{ s: '10:00', e: '14:00' }] })).toBe('10:00 ص – 2:00 م');
  });
});
