import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { assertUuid, handler, HttpError, json, parseBody, requireBusiness } from '@/lib/server/api';
import { productDTO } from '@/lib/server/state';
import { productSchema } from '@/lib/validation';
import { deleteBlob, verifyOwnedBlob } from '@/lib/server/media';
import { isUniqueViolation, nextSku, ownProduct, purgeDeleted } from '@/lib/server/products';

const { products } = schema;
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { userId, business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const prev = await ownProduct(business.id, id);
  const input = await parseBody(req, productSchema);
  const imageChanged = input.image !== undefined && (input.image?.url ?? null) !== prev.imageUrl;
  if (imageChanged && input.image) await verifyOwnedBlob('products', userId, input.image);
  try {
    const [row] = await db()
      .update(products)
      .set({
        sku: input.sku || (await nextSku(business.id)),
        name: input.name,
        priceMinor: input.price,
        currency: input.currency,
        description: input.description,
        ...(imageChanged ? { imageUrl: input.image?.url ?? null, imagePathname: input.image?.pathname ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(products.id, id), eq(products.businessId, business.id)))
      .returning();
    if (imageChanged) await deleteBlob(prev.imageUrl);
    return json(productDTO(row));
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'هالرمز مستخدم لمنتج ثاني');
    throw e;
  }
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  await ownProduct(business.id, id);
  await db()
    .update(products)
    .set({ deletedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.businessId, business.id)));
  await purgeDeleted(business.id);
  return json({ ok: true });
});
