import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, HttpError, json, requireBusiness } from '@/lib/server/api';

const { closures } = schema;
type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const gone = await db()
    .delete(closures)
    .where(and(eq(closures.id, id), eq(closures.businessId, business.id)))
    .returning({ id: closures.id });
  if (!gone.length) throw new HttpError(404, 'مش موجود');
  return json({ ok: true });
});
