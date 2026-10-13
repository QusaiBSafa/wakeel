import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { notifySchema } from '@/lib/validation';

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const input = await parseBody(req, notifySchema);
  await db().insert(schema.notifyRequests).values({ businessId: business.id, feature: input.feature }).onConflictDoNothing();
  return json({ ok: true });
});
