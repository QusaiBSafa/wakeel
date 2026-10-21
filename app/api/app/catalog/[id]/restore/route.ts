import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, json, requireBusiness } from '@/lib/server/api';
import { ownItem } from '@/lib/server/catalog';
import { staffIdsOf } from '@/lib/server/catalog-write';
import { itemDTO } from '@/lib/server/dto';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownItem(business.id, id, { deleted: true });
  const [row] = await db().update(schema.catalogItems).set({ deletedAt: null }).where(eq(schema.catalogItems.id, id)).returning();
  return json(itemDTO(row, await staffIdsOf(id)));
});
