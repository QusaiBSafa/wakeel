import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { nowInTz } from '@/lib/time';
import type { BusinessRow } from '../business';
import { faqDTO } from '../dto';

const { faqs } = schema;

export async function loadFaq(business: BusinessRow) {
  const t = nowInTz();
  const month = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  const rows = await db()
    .select()
    .from(faqs)
    .where(and(eq(faqs.businessId, business.id), isNull(faqs.deletedAt)))
    .orderBy(asc(faqs.position), asc(faqs.createdAt));
  return {
    faqs: rows.map((f) => faqDTO(f, month)),
    type: business.type,
    dismissed: business.dismissedFaqSuggestions,
    now: new Date().toISOString(),
  };
}
export type FaqData = Awaited<ReturnType<typeof loadFaq>>;
