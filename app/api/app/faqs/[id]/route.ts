import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, HttpError, json, parseBody, requireBusiness } from '@/lib/server/api';
import { faqDTO } from '@/lib/server/state';
import { faqUpdateSchema } from '@/lib/validation';

const { faqs } = schema;
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const input = await parseBody(req, faqUpdateSchema);
  const set: Partial<typeof faqs.$inferInsert> = { updatedAt: new Date() };
  if (input.answer !== undefined) set.answer = input.answer;
  if (input.status !== undefined) set.status = input.status;
  // an "answered" question needs an answer
  if (set.status === 'answered' && input.answer !== undefined && !input.answer) set.status = 'open';
  const [row] = await db()
    .update(faqs)
    .set(set)
    .where(and(eq(faqs.id, id), eq(faqs.businessId, business.id)))
    .returning();
  if (!row) throw new HttpError(404, 'السؤال مش موجود');
  return json(faqDTO(row));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const gone = await db()
    .delete(faqs)
    .where(and(eq(faqs.id, id), eq(faqs.businessId, business.id)))
    .returning({ id: faqs.id });
  if (!gone.length) throw new HttpError(404, 'السؤال مش موجود');
  return json({ ok: true });
});
