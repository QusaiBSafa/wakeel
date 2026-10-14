import 'server-only';
import { and, asc, desc, eq, gt, inArray, ne, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { atMinutes, dayStart, ymd } from '@/lib/time';
import type { BusinessRow } from '../business';
import { aiEffective } from '../ai';
import { bookingDTO, statsDTO, waDTO } from '../dto';
import { attentionFor } from './shared';

const { orders, orderItems, bookings, dailyStats, aiSettings, whatsappConnections } = schema;

export async function loadHome(business: BusinessRow) {
  const d = db();
  const now = new Date();
  const today = ymd(now);
  const dayEnd = atMinutes(today, 1440);
  const [attention, [stats], [ai], [wa], newOrders, recent, upcoming, todayCount] = await Promise.all([
    attentionFor(business.id),
    d.select().from(dailyStats).where(and(eq(dailyStats.businessId, business.id), eq(dailyStats.day, today))).limit(1),
    d.select().from(aiSettings).where(eq(aiSettings.businessId, business.id)).limit(1),
    d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1),
    d
      .select({ n: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${orders.totalMinor}), 0)::int` })
      .from(orders)
      .where(and(eq(orders.businessId, business.id), eq(orders.status, 'new'))),
    d.select().from(orders).where(eq(orders.businessId, business.id)).orderBy(desc(orders.createdAt)).limit(5),
    d
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, business.id), ne(bookings.status, 'cancelled'), gt(bookings.endsAt, now), sql`${bookings.startsAt} < ${dayEnd}`))
      .orderBy(asc(bookings.startsAt))
      .limit(5),
    d
      .select({ n: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(eq(bookings.businessId, business.id), ne(bookings.status, 'cancelled'), sql`${bookings.startsAt} >= ${dayStart(today)}`, sql`${bookings.startsAt} < ${dayEnd}`)),
  ]);

  const ids = recent.map((o) => o.id);
  const items = ids.length ? await d.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.position)) : [];
  const itemsText = (id: string) =>
    items
      .filter((i) => i.orderId === id)
      .map((i) => `${i.name} ×${i.qty}`)
      .join('، ');

  const open = attention;
  return {
    today,
    stats: statsDTO(stats),
    attention: open.slice(0, 3),
    attentionCount: open.length,
    oldestAttentionAt: open[0]?.createdAt ?? null,
    newOrders: { count: newOrders[0]?.n ?? 0, totalMinor: newOrders[0]?.total ?? 0 },
    recentOrders: recent.map((o) => ({
      id: o.id,
      number: o.number,
      customerName: o.customerName,
      status: o.status,
      isDraft: o.isDraft,
      totalMinor: o.totalMinor,
      createdAt: o.createdAt.toISOString(),
      itemsText: itemsText(o.id),
    })),
    upcoming: upcoming.map(bookingDTO),
    bookingsToday: todayCount[0]?.n ?? 0,
    wa: waDTO(wa),
    aiEnabled: aiEffective(ai),
    pausedUntil: ai?.pausedUntil ? ai.pausedUntil.toISOString() : null,
  };
}
export type HomeData = Awaited<ReturnType<typeof loadHome>>;
