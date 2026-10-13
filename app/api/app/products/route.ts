import { count } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, HttpError, json, parseBody, requireBusiness } from '@/lib/server/api';
import { productDTO } from '@/lib/server/state';
import { productSchema } from '@/lib/validation';
import { verifyOwnedBlob } from '@/lib/server/media';
import { isUniqueViolation, live, nextSku, purgeDeleted } from '@/lib/server/products';

const { products } = schema;
const MAX_PRODUCTS = 1000;

export const POST = handler(async (req: Request) => {
  const { userId, business } = await requireBusiness();
  const input = await parseBody(req, productSchema);
  const [{ n }] = await db().select({ n: count() }).from(products).where(live(business.id));
  if (n >= MAX_PRODUCTS) throw new HttpError(400, 'وصلت للحد الأقصى من المنتجات');
  if (input.image) await verifyOwnedBlob('products', userId, input.image);
  try {
    const [row] = await db()
      .insert(products)
      .values({
        businessId: business.id,
        sku: input.sku || (await nextSku(business.id)),
        name: input.name,
        priceMinor: input.price,
        currency: input.currency,
        description: input.description,
        imageUrl: input.image?.url ?? null,
        imagePathname: input.image?.pathname ?? null,
      })
      .returning();
    await purgeDeleted(business.id);
    return json(productDTO(row), 201);
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'هالرمز مستخدم لمنتج ثاني');
    throw e;
  }
});
