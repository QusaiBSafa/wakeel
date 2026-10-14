import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, assertUuid, handler, json, requireBusiness } from '@/lib/server/api';
import { bumpStat } from '@/lib/server/stats';

type Ctx = { params: Promise<{ id: string }> };

/** Resolve: the row is deleted (its details go with it) and today's «resolved» counter goes up. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const gone = await db()
    .delete(schema.attentionItems)
    .where(and(eq(schema.attentionItems.id, id), eq(schema.attentionItems.businessId, business.id)))
    .returning({ id: schema.attentionItems.id });
  if (!gone.length) throw new HttpError(404, 'غير موجود');
  await bumpStat(business.id, 'resolved');
  return json({ ok: true });
});
