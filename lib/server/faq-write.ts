import 'server-only';
import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { nowInTz } from '@/lib/time';
import { HttpError } from './api';
import { faqDTO } from './dto';

const t = schema;
export const currentMonth = () => {
  const n = nowInTz();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
};

export async function ownFaq(businessId: string, id: string, deleted = false) {
  const [row] = await db()
    .select()
    .from(t.faqs)
    .where(and(eq(t.faqs.id, id), eq(t.faqs.businessId, businessId), deleted ? isNotNull(t.faqs.deletedAt) : sql`${t.faqs.deletedAt} is null`))
    .limit(1);
  if (!row) throw new HttpError(404, 'غير موجود');
  return row;
}

/** Remove soft-deleted FAQs whose undo window (5 minutes) has passed. */
export async function purgeFaqs(businessId: string) {
  await db().delete(t.faqs).where(and(eq(t.faqs.businessId, businessId), isNotNull(t.faqs.deletedAt), lt(t.faqs.deletedAt, new Date(Date.now() - 5 * 60 * 1000))));
}

export async function createFaq(businessId: string, b: { question: string; answer: string; category?: 'general' | 'bookings' | 'prices' | 'delivery' | 'products'; enabled?: boolean; alts?: string[]; templateKey?: string | null }) {
  const d = db();
  if (b.templateKey) {
    // a deleted FAQ from the same suggestion would block the unique key
    await d.update(t.faqs).set({ templateKey: null }).where(and(eq(t.faqs.businessId, businessId), eq(t.faqs.templateKey, b.templateKey), isNotNull(t.faqs.deletedAt)));
  }
  const [min] = await d.select({ m: sql<number>`coalesce(min(${t.faqs.position}), 0)::int` }).from(t.faqs).where(eq(t.faqs.businessId, businessId));
  const [row] = await d
    .insert(t.faqs)
    .values({ businessId, question: b.question, answer: b.answer, category: b.category ?? 'general', enabled: b.enabled ?? true, alts: b.alts ?? [], templateKey: b.templateKey ?? null, position: (min?.m ?? 0) - 1 })
    .returning();
  return faqDTO(row, currentMonth());
}
