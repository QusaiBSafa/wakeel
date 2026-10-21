import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { ymd } from '@/lib/time';
import type { BusinessRow } from '../business';
import { attentionFor } from './shared';

const { dailyStats } = schema;

export async function loadAttention(business: BusinessRow) {
  const [items, [stats]] = await Promise.all([
    attentionFor(business.id),
    db().select({ resolved: dailyStats.resolved }).from(dailyStats).where(and(eq(dailyStats.businessId, business.id), eq(dailyStats.day, ymd(Date.now())))).limit(1),
  ]);
  return { items, resolvedToday: stats?.resolved ?? 0, now: new Date().toISOString() };
}
export type AttentionData = Awaited<ReturnType<typeof loadAttention>>;
