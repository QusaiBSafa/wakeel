import 'server-only';
import { and, eq, isNull, isNotNull, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError } from './api';
import { deleteBlob } from './media';

const { products } = schema;
const UNDO_WINDOW_MS = 5 * 60 * 1000;

export const live = (businessId: string) => and(eq(products.businessId, businessId), isNull(products.deletedAt));

export async function nextSku(businessId: string): Promise<string> {
  const rows = await db().select({ sku: products.sku }).from(products).where(live(businessId));
  const taken = new Set(rows.map((r) => r.sku.toLowerCase()));
  let n = rows.length + 1;
  while (taken.has(`prd-${String(n).padStart(3, '0')}`)) n++;
  return `PRD-${String(n).padStart(3, '0')}`;
}

export async function ownProduct(businessId: string, id: string, opts: { deleted?: boolean } = {}) {
  const [row] = await db()
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.businessId, businessId), opts.deleted ? isNotNull(products.deletedAt) : isNull(products.deletedAt)))
    .limit(1);
  if (!row) throw new HttpError(404, 'المنتج مش موجود');
  return row;
}

/** Hard-delete products whose undo window has passed, and their photos. */
export async function purgeDeleted(businessId: string) {
  const cutoff = new Date(Date.now() - UNDO_WINDOW_MS);
  const gone = await db()
    .delete(products)
    .where(and(eq(products.businessId, businessId), isNotNull(products.deletedAt), lt(products.deletedAt, cutoff)))
    .returning({ imageUrl: products.imageUrl });
  await Promise.all(gone.map((g) => deleteBlob(g.imageUrl)));
}

export function isUniqueViolation(e: unknown) {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}
