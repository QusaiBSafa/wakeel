import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

const { businesses } = schema;

export type BusinessRow = typeof businesses.$inferSelect;

export async function findBusiness(userId: string): Promise<BusinessRow | null> {
  const rows = await db().select().from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Photos are stored in a private Blob store and served via /media/<pathname>. */
export function mediaUrl(pathname: string | null | undefined): string | null {
  return pathname ? `/media/${pathname}` : null;
}
