import { and, count, eq, max } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, HttpError, json, parseBody, requireBusiness } from '@/lib/server/api';
import { faqDTO } from '@/lib/server/state';
import { faqCreateSchema } from '@/lib/validation';
import { isUniqueViolation } from '@/lib/server/products';

const { faqs } = schema;

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const input = await parseBody(req, faqCreateSchema);
  const [{ n, top }] = await db()
    .select({ n: count(), top: max(faqs.position) })
    .from(faqs)
    .where(eq(faqs.businessId, business.id));
  if (n >= 200) throw new HttpError(400, 'وصلت للحد الأقصى من الأسئلة');
  const dup = await db()
    .select({ id: faqs.id })
    .from(faqs)
    .where(and(eq(faqs.businessId, business.id), eq(faqs.question, input.question)))
    .limit(1);
  if (dup.length) throw new HttpError(409, 'هالسؤال موجود بالقائمة');
  const status = input.status ?? (input.answer ? 'answered' : 'open');
  try {
    const [row] = await db()
      .insert(faqs)
      .values({
        businessId: business.id,
        templateKey: input.templateKey ?? null,
        question: input.question,
        answer: input.answer,
        status: status === 'answered' && !input.answer ? 'open' : status,
        position: input.position ?? (top ?? 0) + 10,
      })
      .returning();
    return json(faqDTO(row), 201);
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'هالسؤال موجود بالقائمة');
    throw e;
  }
});
