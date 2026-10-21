import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { aiPauseSchema } from '@/lib/validation/ai';
import { addDays, atMinutes, ymd } from '@/lib/time';

/** Pause Hudhud: for an hour, until 9:00 tomorrow (Asia/Hebron), or until switched back on by hand. */
export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const { duration } = await parseBody(req, aiPauseSchema);
  const now = new Date();
  const pausedUntil = duration === '1h' ? new Date(now.getTime() + 3600_000) : duration === 'tmr' ? atMinutes(addDays(ymd(now), 1), 9 * 60) : null;
  await db()
    .insert(schema.aiSettings)
    .values({ businessId: business.id, enabled: false, pausedUntil })
    .onConflictDoUpdate({ target: schema.aiSettings.businessId, set: { enabled: false, pausedUntil, updatedAt: now } });
  return json({ enabled: false, pausedUntil: pausedUntil ? pausedUntil.toISOString() : null });
});
