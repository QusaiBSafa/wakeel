import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, json, requireBusiness } from '@/lib/server/api';
import { faqDTO } from '@/lib/server/dto';
import { currentMonth, ownFaq } from '@/lib/server/faq-write';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownFaq(business.id, id, true);
  const [row] = await db().update(schema.faqs).set({ deletedAt: null }).where(eq(schema.faqs.id, id)).returning();
  return json(faqDTO(row, currentMonth()));
});
