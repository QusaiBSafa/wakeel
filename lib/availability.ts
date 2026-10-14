// Pure slot computation shared by the slot picker (server route) and the booking commit check.
import { addDays, atMinutes, weekdayOf, ymd } from './time';

export type HoursRow = { weekday: number; open: boolean; openMin: number; closeMin: number; breakStartMin: number | null; breakEndMin: number | null };
export type LeaveRow = { memberId: string; from: string; to: string };
export type BusyBooking = { id: string; memberId: string | null; startsAt: Date | string | number; blockedUntil: Date | string | number; status: string };

export type SlotReason = '' | 'مغلق' | 'عطلة' | 'غياب' | 'خارج مدة الحجز المسموحة' | 'خارج أوقات العمل' | 'استراحة' | 'انقضى الوقت' | 'محجوز';

export type SlotInput = {
  hours: HoursRow[];
  closures: string[];
  leaves: LeaveRow[];
  bookings: BusyBooking[];
  memberId: string;
  durationMin: number;
  bufferMin: number;
  /** YYYY-MM-DD in the business time zone */
  date: string;
  now: Date;
  leadMinutes: number;
  horizonDays: number;
  /** weekdays (0 = Saturday) the service is offered on */
  serviceDays: number[];
  /** a booking being rescheduled does not block itself */
  excludeId?: string;
  stepMin?: number;
};

const ACTIVE = new Set(['pending', 'confirmed']);

/** Why `startMin` cannot be booked on `date`, or '' when it is free. Rules are applied in a fixed order. */
export function slotReason(i: SlotInput, startMin: number): SlotReason {
  const wd = weekdayOf(i.date);
  const h = i.hours.find((x) => x.weekday === wd);
  if (!h || !h.open || !i.serviceDays.includes(wd)) return 'مغلق';
  if (i.closures.includes(i.date)) return 'عطلة';
  if (i.leaves.some((l) => l.memberId === i.memberId && l.from <= i.date && i.date <= l.to)) return 'غياب';
  if (i.date > addDays(ymd(i.now), i.horizonDays)) return 'خارج مدة الحجز المسموحة';
  const end = startMin + i.durationMin;
  if (startMin < h.openMin || end > h.closeMin) return 'خارج أوقات العمل';
  if (h.breakStartMin !== null && h.breakEndMin !== null && startMin < h.breakEndMin && end > h.breakStartMin) return 'استراحة';
  const startsAt = atMinutes(i.date, startMin).getTime();
  if (startsAt <= i.now.getTime() + i.leadMinutes * 60000) return 'انقضى الوقت';
  const blockedUntil = startsAt + (i.durationMin + i.bufferMin) * 60000;
  const clash = i.bookings.some(
    (b) => b.id !== i.excludeId && b.memberId === i.memberId && ACTIVE.has(b.status) && startsAt < new Date(b.blockedUntil).getTime() && blockedUntil > new Date(b.startsAt).getTime(),
  );
  return clash ? 'محجوز' : '';
}

/** Candidate starts run from opening to closing − duration, every `stepMin` minutes (30 by default). */
export function slotsFor(i: SlotInput): { startMin: number; reason: SlotReason }[] {
  const h = i.hours.find((x) => x.weekday === weekdayOf(i.date));
  if (!h) return [];
  const step = i.stepMin ?? 30;
  const out: { startMin: number; reason: SlotReason }[] = [];
  for (let t = h.openMin; t + i.durationMin <= h.closeMin; t += step) out.push({ startMin: t, reason: slotReason(i, t) });
  return out;
}
