import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, requireBusiness } from '@/lib/server/api';
import { disconnectProvider } from '@/lib/server/wa/pairing';

export const POST = handler(async () => {
  const { business } = await requireBusiness();
  await disconnectProvider(business.id);
  const now = new Date();
  const rows = await db().update(schema.whatsappConnections).set({ status: 'disconnected', disconnectedAt: now }).where(eq(schema.whatsappConnections.businessId, business.id)).returning({ id: schema.whatsappConnections.businessId });
  if (!rows.length) throw new HttpError(404, 'غير موجود');
  return json({ status: 'disconnected', disconnectedAt: now.toISOString() });
});
