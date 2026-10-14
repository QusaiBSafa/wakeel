import 'server-only';
import { and, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError } from './api';
import { deleteBlob } from './media';

const { catalogItems } = schema;
const UNDO_WINDOW_MS = 5 * 60 * 1000;

export const live = (businessId: string) => and(eq(catalogItems.businessId, businessId), isNull(catalogItems.deletedAt));

export async function ownItem(businessId: string, id: string, opts: { deleted?: boolean } = {}) {
  const [row] = await db()
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.id, id), eq(catalogItems.businessId, businessId), opts.deleted ? isNotNull(catalogItems.deletedAt) : isNull(catalogItems.deletedAt)))
    .limit(1);
  if (!row) throw new HttpError(404, 'غير موجود');
  return row;
}

/** Hard-delete items whose undo window has passed, and their photos. */
export async function purgeDeleted(businessId: string) {
  const cutoff = new Date(Date.now() - UNDO_WINDOW_MS);
  const gone = await db()
    .delete(catalogItems)
    .where(and(eq(catalogItems.businessId, businessId), isNotNull(catalogItems.deletedAt), lt(catalogItems.deletedAt, cutoff)))
    .returning({ imageUrl: catalogItems.imageUrl });
  await Promise.all(gone.map((g) => deleteBlob(g.imageUrl)));
}
