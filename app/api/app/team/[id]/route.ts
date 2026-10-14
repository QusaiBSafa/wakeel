import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { memberDTO } from '@/lib/server/dto';
import { teamPatchSchema } from '@/lib/validation/account';

type Ctx = { params: Promise<{ id: string }> };

async function own(businessId: string, id: string) {
  assertUuid(id);
  const [m] = await db().select().from(schema.teamMembers).where(and(eq(schema.teamMembers.id, id), eq(schema.teamMembers.businessId, businessId))).limit(1);
  if (!m) throw new HttpError(404, 'غير موجود');
  if (m.role === 'owner') throw new HttpError(409, 'لا يمكن تعديل المالك أو إزالته');
  return m;
}

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const m = await own(business.id, (await ctx.params).id);
  const { role } = await parseBody(req, teamPatchSchema);
  const [row] = await db().update(schema.teamMembers).set({ role }).where(eq(schema.teamMembers.id, m.id)).returning();
  return json(memberDTO(row));
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const m = await own(business.id, (await ctx.params).id);
  await db().delete(schema.teamMembers).where(eq(schema.teamMembers.id, m.id));
  return json({ ok: true });
});
