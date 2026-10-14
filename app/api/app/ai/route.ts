import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { aiPutSchema } from '@/lib/validation/ai';

/** Saves the AI settings config (the on/off switch has its own pause / resume routes). */
export const PUT = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const { config } = await parseBody(req, aiPutSchema);
  const now = new Date();
  await db()
    .insert(schema.aiSettings)
    .values({ businessId: business.id, config })
    .onConflictDoUpdate({ target: schema.aiSettings.businessId, set: { config, updatedAt: now } });
  return json({ config });
});
