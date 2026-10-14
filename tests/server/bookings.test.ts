import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, HAS_DB, makeBusiness } from './helpers';
import type { BusinessRow } from '@/lib/server/business';

describe.skipIf(!HAS_DB)('booking engine (local Postgres)', () => {
  let b: BusinessRow;
  let serviceId: string;
  let memberId: string;
  let date: string;

  beforeAll(async () => {
    const { db, schema } = await import('@/lib/db');
    const { addDays, weekdayOf, ymd } = await import('@/lib/time');
    b = await makeBusiness();
    const [m] = await db().insert(schema.teamMembers).values({ businessId: b.id, name: 'سارة', role: 'staff', status: 'pending', color: 1, providesServices: true }).returning();
    memberId = m.id;
    const [svc] = await db().insert(schema.catalogItems).values({ businessId: b.id, kind: 'service', name: 'قص', priceMinor: 7000, durationMin: 60, bufferMin: 0 }).returning();
    serviceId = svc.id;
    await db().insert(schema.serviceStaff).values({ itemId: svc.id, memberId });
    // the first open weekday (not Friday) at least 2 days from now
    date = addDays(ymd(Date.now()), 2);
    while (weekdayOf(date) === 6) date = addDays(date, 1);
  });
  afterAll(cleanup);

  const body = (startMin: number, name = 'ليان') => ({ customer: name, phone: '+970 59 123 4567', itemId: serviceId, date, startMin });

  it('two concurrent bookings for the same slot: exactly one wins, the other is a 409', async () => {
    const { createBooking } = await import('@/lib/server/bookings');
    const r = await Promise.allSettled([createBooking(b, body(11 * 60, 'أ')), createBooking(b, body(11 * 60, 'ب'))]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const lost = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(lost.reason).toMatchObject({ status: 409 });
  });

  it('the slot list shows the taken slot as «محجوز» and numbers continue the counter', async () => {
    const { slotsFor_ } = await import('@/lib/server/bookings');
    const s = await slotsFor_(b, serviceId, date);
    expect(s.slots.find((x) => x.startMin === 660)?.reason).toBe('محجوز');
    expect(s.slots.find((x) => x.startMin === 720)?.reason).toBe('');
    expect(s.memberName).toBe('سارة');
  });

  it('reschedule excludes its own booking, rejects a taken slot, and status rules are enforced', async () => {
    const { createBooking, rescheduleBooking, setBookingStatus } = await import('@/lib/server/bookings');
    const a = await createBooking(b, body(14 * 60, 'ج'));
    expect(a.status).toBe('confirmed');
    expect(a.number).toBeGreaterThan(100);
    // move within its own slot window: ok because it does not block itself
    const moved = await rescheduleBooking(b, a.id, { date, startMin: 14 * 60 + 30 });
    expect(new Date(moved.startsAt).getTime()).toBeGreaterThan(new Date(a.startsAt).getTime());
    await expect(rescheduleBooking(b, a.id, { date, startMin: 11 * 60 })).rejects.toMatchObject({ status: 409 });
    // future booking cannot be completed yet; confirmed cannot be "confirmed" again
    await expect(setBookingStatus(b, a.id, 'done')).rejects.toMatchObject({ status: 409 });
    await expect(setBookingStatus(b, a.id, 'confirmed')).rejects.toMatchObject({ status: 409 });
    const cancelled = await setBookingStatus(b, a.id, 'cancelled');
    expect(cancelled.status).toBe('cancelled');
    // a cancelled booking frees its slot and cannot be rescheduled
    await expect(rescheduleBooking(b, a.id, { date, startMin: 16 * 60 })).rejects.toMatchObject({ status: 409 });
    const again = await createBooking(b, body(14 * 60 + 30, 'د'));
    expect(again.status).toBe('confirmed');
  });

  it('rejects outside hours, the break and a closed day', async () => {
    const { createBooking } = await import('@/lib/server/bookings');
    await expect(createBooking(b, body(7 * 60))).rejects.toMatchObject({ status: 409 });
    const { addDays, weekdayOf } = await import('@/lib/time');
    let friday = date;
    while (weekdayOf(friday) !== 6) friday = addDays(friday, 1);
    await expect(createBooking(b, { ...body(10 * 60), date: friday })).rejects.toMatchObject({ status: 409 });
  });
});
