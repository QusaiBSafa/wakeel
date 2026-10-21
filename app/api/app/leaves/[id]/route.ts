import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, assertUuid, handler, json, requireBusiness } from '@/lib/server/api';

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const gone = await db().delete(schema.staffLeaves).where(and(eq(schema.staffLeaves.id, id), eq(schema.staffLeaves.businessId, business.id))).returning({ id: schema.staffLeaves.id });
  if (!gone.length) throw new HttpError(404, 'غير موجود');
  return json({ ok: true });
});
