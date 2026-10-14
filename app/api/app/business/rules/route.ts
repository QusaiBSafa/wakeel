import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { rulesSchema } from '@/lib/validation/business';

export const PUT = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const { rules } = await parseBody(req, rulesSchema);
  await db().update(schema.businesses).set({ rules, updatedAt: new Date() }).where(eq(schema.businesses.id, business.id));
  return json({ rules });
});
