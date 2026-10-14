import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, requireBusiness } from '@/lib/server/api';

/** STUB renewal: another 60 days, status back to connected. */
export const POST = handler(async () => {
  const { business } = await requireBusiness();
  const exp = new Date(Date.now() + 60 * 86400000);
  const rows = await db().update(schema.whatsappConnections).set({ status: 'connected', tokenExpiresAt: exp, disconnectedAt: null }).where(eq(schema.whatsappConnections.businessId, business.id)).returning({ id: schema.whatsappConnections.businessId });
  if (!rows.length) throw new HttpError(404, 'غير موجود');
  return json({ status: 'connected', tokenExpiresAt: exp.toISOString() });
});
