import 'server-only';
import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { bookableMembers } from '@/lib/team';
import { addDays, atMinutes, weekdayOf, ymd } from '@/lib/time';
import type { BusinessRow } from '../business';
import { getSettings } from '../business';
import { bookingDTO, hoursDTO } from '../dto';
import { catalogFor, membersFor } from './shared';

const { bookings, businessHours, closures, staffLeaves } = schema;

/** Bookings between two YYYY-MM-DD dates (inclusive, business time zone). */
export async function bookingsBetween(businessId: string, from: string, to: string) {
  const rows = await db()
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, businessId), gte(bookings.startsAt, atMinutes(from, 0)), lt(bookings.startsAt, atMinutes(addDays(to, 1), 0))))
    .orderBy(asc(bookings.startsAt));
  return rows.map(bookingDTO);
}

/** Initial load: the current week (Saturday–Friday) ± 7 days. */
export async function loadBookings(business: BusinessRow) {
  const d = db();
  const today = ymd(Date.now());
  const weekStart = addDays(today, -weekdayOf(today));
  const from = addDays(weekStart, -7);
  const to = addDays(weekStart, 13);
  const [list, members, catalog, hours, settings, cl, leaves] = await Promise.all([
    bookingsBetween(business.id, from, to),
    membersFor(business.id),
    catalogFor(business.id),
    d.select().from(businessHours).where(eq(businessHours.businessId, business.id)).orderBy(asc(businessHours.weekday)),
    getSettings(business),
    d.select().from(closures).where(eq(closures.businessId, business.id)).orderBy(asc(closures.date)),
    d.select().from(staffLeaves).where(eq(staffLeaves.businessId, business.id)).orderBy(asc(staffLeaves.fromDate)),
  ]);
  return {
    today,
    range: { from, to },
    bookings: list,
    members,
    bookableIds: bookableMembers(members).map((m) => m.id),
    services: catalog.filter((c) => c.kind === 'service'),
    hours: hours.map(hoursDTO),
    rules: { leadMinutes: settings.leadMinutes, horizonDays: settings.horizonDays, autoConfirm: settings.autoConfirm },
    closures: cl.map((c) => ({ id: c.id, date: c.date, note: c.note })),
    leaves: leaves.map((l) => ({ id: l.id, memberId: l.memberId, from: l.fromDate, to: l.toDate, note: l.note })),
    now: new Date().toISOString(),
  };
}
export type BookingsData = Awaited<ReturnType<typeof loadBookings>>;
