import { assertStub } from '@/lib/server/wa/pairing';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { waVerifySchema } from '@/lib/validation/account';

/** STUB: any 6-digit code except 000000 connects. The row is flagged is_stub. */
export const POST = handler(async (req: Request) => {
  assertStub();
  const { business } = await requireBusiness();
  const { phone, code } = await parseBody(req, waVerifySchema);
  if (code === '000000') throw new HttpError(400, 'الرمز غير صحيح. تحقّق منه أو اطلب رمزاً جديداً');
  const now = new Date();
  const row = { status: 'connected' as const, phone, displayName: business.name, connectedAt: now, tokenExpiresAt: new Date(now.getTime() + 60 * 86400000), disconnectedAt: null, isStub: true };
  await db().insert(schema.whatsappConnections).values({ businessId: business.id, ...row }).onConflictDoUpdate({ target: schema.whatsappConnections.businessId, set: row });
  return json({ ok: true, phone });
});
