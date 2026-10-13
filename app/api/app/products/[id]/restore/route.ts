import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, HttpError, json, requireBusiness } from '@/lib/server/api';
import { productDTO } from '@/lib/server/state';
import { isUniqueViolation, ownProduct } from '@/lib/server/products';

const { products } = schema;
type Ctx = { params: Promise<{ id: string }> };

/** Undo a delete within the undo window. */
export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownProduct(business.id, id, { deleted: true });
  try {
    const [row] = await db()
      .update(products)
      .set({ deletedAt: null })
      .where(and(eq(products.id, id), eq(products.businessId, business.id)))
      .returning();
    return json(productDTO(row));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'هالرمز صار مستخدم لمنتج ثاني');
    throw e;
  }
});
