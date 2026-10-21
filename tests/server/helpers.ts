import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { createBusiness, type BusinessRow } from '@/lib/server/business';

export const HAS_DB = !!process.env.DATABASE_URL;
const created: string[] = [];

export const user = { fullName: 'سامي ناصر', firstName: 'سامي', lastName: 'ناصر', primaryEmailAddress: { emailAddress: 'owner@example.com' } };

/** A fresh business with its owner member, defaults and hours. Removed again by cleanup(). */
export async function makeBusiness(over: Partial<typeof schema.businesses.$inferInsert> = {}): Promise<BusinessRow> {
  const uid = 'user_t' + Math.random().toString(36).slice(2, 10);
  const b = await createBusiness(uid, { name: 'صالون لمسة', phone: '+970 59 123 4567', type: 'salon', offers: { products: true, services: true, delivery: true }, ...over }, user);
  created.push(b.id);
  return b;
}

export async function cleanup() {
  for (const id of created.splice(0)) await db().delete(schema.businesses).where(eq(schema.businesses.id, id));
}
