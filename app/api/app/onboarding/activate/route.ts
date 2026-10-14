import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, requireBusiness } from '@/lib/server/api';

/** Turn Hudhud on. Needs a connected WhatsApp number. */
export const POST = handler(async () => {
  const { business } = await requireBusiness();
  const [wa] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, business.id)).limit(1);
  if (!wa || wa.status !== 'connected') throw new HttpError(409, 'يجب ربط واتساب قبل التفعيل');
  const now = new Date();
  await db().transaction(async (tx) => {
    await tx
      .update(schema.businesses)
      .set({ onboardedAt: business.onboardedAt ?? now, onboarding: { ...business.onboarding, step: 8, maxStep: 8 }, updatedAt: now })
      .where(eq(schema.businesses.id, business.id));
    await tx
      .insert(schema.aiSettings)
      .values({ businessId: business.id, enabled: true })
      .onConflictDoUpdate({ target: schema.aiSettings.businessId, set: { enabled: true, pausedUntil: null, updatedAt: now } });
  });
  return json({ ok: true, phone: wa.phone });
});
