import { describe, expect, it } from 'vitest';
import { slotReason, slotsFor, type SlotInput } from '../lib/availability';
import { atMinutes } from '../lib/time';

// 2026-10-14 is a Wednesday (weekday 4). 09:00–19:00, break 13:00–14:00; Friday (6) closed.
const hours = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  open: weekday !== 6,
  openMin: 540,
  closeMin: 1140,
  breakStartMin: 780,
  breakEndMin: 840,
}));
const NOW = atMinutes('2026-10-14', 11 * 60 + 10);
const base: SlotInput = {
  hours,
  closures: [],
  leaves: [],
  bookings: [],
  memberId: 'm1',
  durationMin: 60,
  bufferMin: 0,
  date: '2026-10-15', // Thursday
  now: NOW,
  leadMinutes: 120,
  horizonDays: 30,
  serviceDays: [0, 1, 2, 3, 4, 5, 6],
};
const at = (i: Partial<SlotInput>, startMin: number) => slotReason({ ...base, ...i }, startMin);
const booking = (date: string, from: number, to: number, o: Partial<{ id: string; memberId: string; status: string }> = {}) => ({
  id: 'b1',
  memberId: 'm1',
  status: 'confirmed',
  startsAt: atMinutes(date, from),
  blockedUntil: atMinutes(date, to),
  ...o,
});

describe('slotReason', () => {
  it('is free on an ordinary open day', () => {
    expect(at({}, 600)).toBe('');
  });
  it('1: closed day, or a weekday the service is not offered', () => {
    expect(at({ date: '2026-10-16' }, 600)).toBe('مغلق');
    expect(at({ serviceDays: [0, 1] }, 600)).toBe('مغلق');
  });
  it('2: holiday', () => {
    expect(at({ closures: ['2026-10-15'] }, 600)).toBe('عطلة');
  });
  it('3: staff leave covers the day (inclusive), other members are unaffected', () => {
    expect(at({ leaves: [{ memberId: 'm1', from: '2026-10-15', to: '2026-10-16' }] }, 600)).toBe('غياب');
    expect(at({ leaves: [{ memberId: 'm2', from: '2026-10-15', to: '2026-10-16' }] }, 600)).toBe('');
  });
  it('4: beyond the booking horizon', () => {
    expect(at({ date: '2026-11-12' }, 600)).toBe(''); // inside the 30 day horizon
    expect(at({ date: '2026-11-14' }, 600)).toBe('خارج مدة الحجز المسموحة');
    expect(at({ date: '2026-10-22', horizonDays: 7 }, 600)).toBe('خارج مدة الحجز المسموحة');
  });
  it('5: outside opening hours', () => {
    expect(at({}, 480)).toBe('خارج أوقات العمل');
    expect(at({}, 1110)).toBe('خارج أوقات العمل'); // 18:30 + 60 > 19:00
  });
  it('6: overlaps the break', () => {
    expect(at({}, 750)).toBe('استراحة'); // 12:30–13:30
    expect(at({}, 840)).toBe(''); // starts when the break ends
    expect(at({}, 720)).toBe(''); // 12:00–13:00 ends when the break starts
  });
  it('7: already passed or inside the lead time', () => {
    expect(at({ date: '2026-10-14' }, 600)).toBe('انقضى الوقت');
    expect(at({ date: '2026-10-14' }, 11 * 60 + 30)).toBe('انقضى الوقت'); // inside the 120 min lead
    expect(at({ date: '2026-10-14' }, 14 * 60)).toBe('');
    expect(at({ date: '2026-10-14', leadMinutes: 0 }, 11 * 60 + 30)).toBe('');
  });
  it('8: overlaps a pending or confirmed booking of the same member', () => {
    const b = [booking('2026-10-15', 600, 660)];
    expect(at({ bookings: b }, 600)).toBe('محجوز');
    expect(at({ bookings: b }, 570)).toBe('محجوز');
    expect(at({ bookings: b }, 660)).toBe('');
    expect(at({ bookings: [booking('2026-10-15', 600, 660, { memberId: 'm2' })] }, 600)).toBe('');
    expect(at({ bookings: [booking('2026-10-15', 600, 660, { status: 'cancelled' })] }, 600)).toBe('');
    expect(at({ bookings: [booking('2026-10-15', 600, 660, { status: 'pending' })] }, 600)).toBe('محجوز');
  });
  it('8: the buffer after a booking blocks the following slot', () => {
    const b = [booking('2026-10-15', 600, 675)]; // 60 min + 15 min buffer
    expect(at({ bookings: b }, 660)).toBe('محجوز');
    expect(at({ bookings: b }, 690)).toBe('');
  });
  it('8: the new booking buffer counts too', () => {
    const b = [booking('2026-10-15', 660, 720)];
    expect(at({ bookings: b, bufferMin: 30 }, 600)).toBe('محجوز'); // 10:00–11:00 + 30 buffer overlaps 11:00
    expect(at({ bookings: b, bufferMin: 0 }, 600)).toBe('');
  });
  it('excludeId lets a booking move within its own slot', () => {
    const b = [booking('2026-10-15', 600, 660, { id: 'mine' })];
    expect(at({ bookings: b }, 600)).toBe('محجوز');
    expect(at({ bookings: b, excludeId: 'mine' }, 600)).toBe('');
  });
  it('applies rules in order: a closure beats a booking', () => {
    expect(at({ closures: ['2026-10-15'], bookings: [booking('2026-10-15', 600, 660)] }, 600)).toBe('عطلة');
  });
});

describe('slotsFor', () => {
  it('lists half-hour starts from opening to closing minus duration', () => {
    const s = slotsFor(base);
    expect(s[0].startMin).toBe(540);
    expect(s[s.length - 1].startMin).toBe(1080); // 18:00 + 60 = 19:00
    expect(s).toHaveLength(19);
    expect(s.find((x) => x.startMin === 780)?.reason).toBe('استراحة');
  });
  it('flags every slot of a closed day', () => {
    expect(slotsFor({ ...base, date: '2026-10-16' }).every((x) => x.reason === 'مغلق')).toBe(true);
  });
});
