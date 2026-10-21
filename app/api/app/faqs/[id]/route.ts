import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { faqDTO } from '@/lib/server/dto';
import { currentMonth, ownFaq, purgeFaqs } from '@/lib/server/faq-write';
import { faqPatchSchema } from '@/lib/validation/faq';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const b = await parseBody(req, faqPatchSchema);
  await ownFaq(business.id, id);
  const [row] = await db()
    .update(schema.faqs)
    .set({
      ...(b.question !== undefined ? { question: b.question } : {}),
      ...(b.answer !== undefined ? { answer: b.answer } : {}),
      ...(b.category !== undefined ? { category: b.category } : {}),
      ...(b.enabled !== undefined ? { enabled: b.enabled } : {}),
      ...(b.alts !== undefined ? { alts: b.alts } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.faqs.id, id))
    .returning();
  return json(faqDTO(row, currentMonth()));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownFaq(business.id, id);
  await db().update(schema.faqs).set({ deletedAt: new Date() }).where(eq(schema.faqs.id, id));
  await purgeFaqs(business.id);
  return json({ ok: true });
});
