import 'server-only';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { nowInTz, ymd } from '@/lib/time';

const { dailyStats } = schema;

export type StatField = 'conversations' | 'autoReplied' | 'ordersLogged' | 'bookingsConfirmed' | 'handedOff' | 'resolved' | 'messages' | 'replyMsTotal' | 'replies';

/** Add `n` to today's counter (day in Asia/Hebron). */
export async function bumpStat(businessId: string, field: StatField, n = 1, day = ymd(Date.now())) {
  await db()
    .insert(dailyStats)
    .values({ businessId, day, [field]: n })
    .onConflictDoUpdate({ target: [dailyStats.businessId, dailyStats.day], set: { [field]: sql`${dailyStats[field]} + ${n}` } });
}

/** Sum of a counter over the current calendar month (Asia/Hebron). */
export async function monthSum(businessId: string, field: StatField): Promise<number> {
  const t = nowInTz();
  const first = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
  const next = t.getMonth() === 11 ? `${t.getFullYear() + 1}-01-01` : `${t.getFullYear()}-${String(t.getMonth() + 2).padStart(2, '0')}-01`;
  const [row] = await db()
    .select({ v: sql<number>`coalesce(sum(${dailyStats[field]}), 0)::int` })
    .from(dailyStats)
    .where(and(eq(dailyStats.businessId, businessId), gte(dailyStats.day, first), lt(dailyStats.day, next)));
  return row?.v ?? 0;
}
