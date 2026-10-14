import 'server-only';
import { and, asc, eq, gte, isNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { slotReason, slotsFor, type SlotReason } from '@/lib/availability';
import { bookableMembers } from '@/lib/team';
import { addDays, atMinutes } from '@/lib/time';
import { HttpError, pgCode } from './api';
import { getSettings, type BusinessRow } from './business';
import { bookingDTO } from './dto';
import { membersFor } from './loaders/shared';
import { stubSend } from './send';

const t = schema;
type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];
type Runner = Tx | ReturnType<typeof db>;

/** Everything slotReason() needs for one service on one date. */
async function context(x: Runner, business: BusinessRow, itemId: string, date: string) {
  const [item] = await x.select().from(t.catalogItems).where(and(eq(t.catalogItems.id, itemId), eq(t.catalogItems.businessId, business.id), isNull(t.catalogItems.deletedAt), eq(t.catalogItems.kind, 'service'))).limit(1);
  if (!item || !item.durationMin) throw new HttpError(404, 'غير موجود');
  const settings = await getSettings(business);
  const links = await x.select({ m: t.serviceStaff.memberId }).from(t.serviceStaff).where(eq(t.serviceStaff.itemId, item.id));
  const members = await membersFor(business.id);
  const assigned = members.filter((m) => links.some((l) => l.m === m.id));
  const staff = assigned.length ? assigned : bookableMembers(members);
  if (!staff.length) throw new HttpError(409, 'لا يوجد موظف متاح لهذه الخدمة');
  const [hours, cl, leaves, bookings] = await Promise.all([
    x.select().from(t.businessHours).where(eq(t.businessHours.businessId, business.id)),
    x.select({ date: t.closures.date }).from(t.closures).where(eq(t.closures.businessId, business.id)),
    x.select().from(t.staffLeaves).where(eq(t.staffLeaves.businessId, business.id)),
    x
      .select({ id: t.bookings.id, memberId: t.bookings.memberId, startsAt: t.bookings.startsAt, blockedUntil: t.bookings.blockedUntil, status: t.bookings.status })
      .from(t.bookings)
      .where(and(eq(t.bookings.businessId, business.id), gte(t.bookings.startsAt, atMinutes(addDays(date, -1), 0)), lt(t.bookings.startsAt, atMinutes(addDays(date, 2), 0)))),
  ]);
  return {
    item,
    staff,
    base: {
      hours: hours.map((h) => ({ weekday: h.weekday, open: h.open, openMin: h.openMin, closeMin: h.closeMin, breakStartMin: h.breakStartMin, breakEndMin: h.breakEndMin })),
      closures: cl.map((c) => c.date),
      leaves: leaves.map((l) => ({ memberId: l.memberId, from: l.fromDate, to: l.toDate })),
      bookings,
      durationMin: item.durationMin,
      bufferMin: item.bufferMin,
      date,
      now: new Date(),
      leadMinutes: settings.leadMinutes,
      horizonDays: settings.horizonDays,
      serviceDays: item.days,
    },
    autoConfirm: settings.autoConfirm,
  };
}

/** Slot list for the picker: a start is free when at least one of the service's staff is free. */
export async function slotsFor_(business: BusinessRow, itemId: string, date: string, excludeId?: string) {
  const c = await context(db(), business, itemId, date);
  const per = c.staff.map((m) => ({ m, slots: slotsFor({ ...c.base, memberId: m.id, excludeId }) }));
  const first = per[0];
  const slots = first.slots.map((s, i) => {
    const free = per.find((p) => p.slots[i].reason === '');
    return { startMin: s.startMin, reason: (free ? '' : s.reason) as SlotReason, memberId: (free ?? first).m.id };
  });
  return { memberId: first.m.id, memberName: first.m.name, durationMin: c.item.durationMin!, slots };
}

function pickMember(c: Awaited<ReturnType<typeof context>>, startMin: number, excludeId?: string, prefer?: string | null) {
  const order = [...c.staff].sort((a, b) => (a.id === prefer ? -1 : b.id === prefer ? 1 : 0));
  let reason: SlotReason = '';
  for (const m of order) {
    const r = slotReason({ ...c.base, memberId: m.id, excludeId }, startMin);
    if (r === '') return { member: m, reason: '' as SlotReason };
    if (!reason) reason = r;
  }
  return { member: null, reason };
}

const MSG: Partial<Record<SlotReason, string>> = { محجوز: 'هذا الوقت محجوز، اختر وقتاً آخر' };
/** Run a booking write; an exclusion violation (someone took the slot meanwhile) becomes the 409 the UI expects. */
async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (pgCode(e) === '23P01') throw new HttpError(409, 'هذا الوقت محجوز، اختر وقتاً آخر');
    throw e;
  }
}

const fail = (r: SlotReason) => new HttpError(409, MSG[r] ?? `هذا الوقت غير متاح (${r})`);

export async function createBooking(business: BusinessRow, b: { customer: string; phone: string; itemId: string; date: string; startMin: number }) {
  const row = await guarded(() => db().transaction(async (tx) => {
    const c = await context(tx, business, b.itemId, b.date);
    const { member, reason } = pickMember(c, b.startMin);
    if (!member) throw fail(reason);
    const startsAt = atMinutes(b.date, b.startMin);
    const endsAt = new Date(startsAt.getTime() + c.item.durationMin! * 60000);
    const [n] = await tx
      .update(t.businesses)
      .set({ nextBookingNo: sql`${t.businesses.nextBookingNo} + 1` })
      .where(eq(t.businesses.id, business.id))
      .returning({ next: t.businesses.nextBookingNo });
    const [r] = await tx
      .insert(t.bookings)
      .values({
        businessId: business.id,
        number: n.next - 1,
        customerName: b.customer,
        customerPhone: b.phone,
        itemId: c.item.id,
        serviceName: c.item.name,
        priceMinor: c.item.priceMinor,
        durationMin: c.item.durationMin!,
        bufferMin: c.item.bufferMin,
        memberId: member.id,
        startsAt,
        endsAt,
        blockedUntil: new Date(endsAt.getTime() + c.item.bufferMin * 60000),
        status: 'confirmed', // an owner's manual booking is always confirmed
        source: 'owner',
      })
      .returning();
    return r;
  }));
  stubSend('booking-confirmed', business.id);
  return bookingDTO(row);
}

export async function rescheduleBooking(business: BusinessRow, id: string, b: { date: string; startMin: number }) {
  const row = await guarded(() => db().transaction(async (tx) => {
    const [cur] = await tx.select().from(t.bookings).where(and(eq(t.bookings.id, id), eq(t.bookings.businessId, business.id))).limit(1);
    if (!cur) throw new HttpError(404, 'غير موجود');
    if (cur.status !== 'pending' && cur.status !== 'confirmed') throw new HttpError(409, 'لا يمكن تغيير موعد هذا الحجز');
    if (!cur.itemId) throw new HttpError(409, 'الخدمة لم تعد موجودة');
    const c = await context(tx, business, cur.itemId, b.date);
    // the booking keeps the duration it was made with
    const base = { ...c.base, durationMin: cur.durationMin, bufferMin: cur.bufferMin };
    const probe = { ...c, base };
    const { member, reason } = pickMember(probe, b.startMin, cur.id, cur.memberId);
    if (!member) throw fail(reason);
    const startsAt = atMinutes(b.date, b.startMin);
    const endsAt = new Date(startsAt.getTime() + cur.durationMin * 60000);
    const [r] = await tx
      .update(t.bookings)
      .set({ memberId: member.id, startsAt, endsAt, blockedUntil: new Date(endsAt.getTime() + cur.bufferMin * 60000), updatedAt: new Date() })
      .where(eq(t.bookings.id, id))
      .returning();
    return r;
  }));
  stubSend('booking-rescheduled', business.id);
  return bookingDTO(row);
}

export async function setBookingStatus(business: BusinessRow, id: string, to: 'confirmed' | 'done' | 'cancelled') {
  const [cur] = await db().select().from(t.bookings).where(and(eq(t.bookings.id, id), eq(t.bookings.businessId, business.id))).limit(1);
  if (!cur) throw new HttpError(404, 'غير موجود');
  const ok =
    (to === 'confirmed' && cur.status === 'pending') ||
    (to === 'done' && cur.status === 'confirmed' && cur.startsAt.getTime() <= Date.now()) ||
    (to === 'cancelled' && (cur.status === 'pending' || cur.status === 'confirmed'));
  if (!ok) throw new HttpError(409, 'لا يمكن تنفيذ هذا الإجراء على الحجز');
  const [r] = await db()
    .update(t.bookings)
    .set({ status: to, updatedAt: new Date(), ...(to === 'cancelled' ? { cancelledAt: new Date() } : {}) })
    .where(eq(t.bookings.id, id))
    .returning();
  if (to !== 'done') stubSend(to === 'confirmed' ? 'booking-confirmed' : 'booking-cancelled', business.id);
  return bookingDTO(r);
}

export async function bookingsInRange(businessId: string, from: string, to: string) {
  const rows = await db()
    .select()
    .from(t.bookings)
    .where(and(eq(t.bookings.businessId, businessId), gte(t.bookings.startsAt, atMinutes(from, 0)), lt(t.bookings.startsAt, atMinutes(addDays(to, 1), 0))))
    .orderBy(asc(t.bookings.startsAt));
  return rows.map(bookingDTO);
}

export async function bookingById(businessId: string, id: string) {
  const [r] = await db().select().from(t.bookings).where(and(eq(t.bookings.id, id), eq(t.bookings.businessId, businessId))).limit(1);
  if (!r) throw new HttpError(404, 'غير موجود');
  return bookingDTO(r);
}

