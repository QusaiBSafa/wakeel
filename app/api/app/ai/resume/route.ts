import { db, schema } from '@/lib/db';
import { handler, json, requireBusiness } from '@/lib/server/api';

export const POST = handler(async () => {
  const { business } = await requireBusiness();
  const now = new Date();
  await db()
    .insert(schema.aiSettings)
    .values({ businessId: business.id, enabled: true, pausedUntil: null })
    .onConflictDoUpdate({ target: schema.aiSettings.businessId, set: { enabled: true, pausedUntil: null, updatedAt: now } });
  return json({ enabled: true });
});
