import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { ownItem, purgeDeleted } from '@/lib/server/catalog';
import { patchItem } from '@/lib/server/catalog-write';
import { catalogPatchSchema } from '@/lib/validation/catalog';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { userId, business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const body = await parseBody(req, catalogPatchSchema);
  const current = await ownItem(business.id, id);
  return json(await patchItem(userId, business.id, current, body));
});

/** Soft delete: the item (and its photo) stays for a few minutes so «تراجع» can bring it back. */
export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownItem(business.id, id);
  await db().update(schema.catalogItems).set({ deletedAt: new Date() }).where(eq(schema.catalogItems.id, id));
  await purgeDeleted(business.id);
  return json({ ok: true });
});
