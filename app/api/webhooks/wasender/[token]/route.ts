import { json } from '@/lib/server/api';
import { handleWasenderWebhook } from '@/lib/server/wa/pairing';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type Ctx = { params: Promise<{ token: string }> };
const MAX_BODY = 256 * 1024;

/**
 * WasenderAPI webhook (session status and incoming messages). Not under /api/app and not behind Clerk: the
 * per-connection token in the URL identifies the business, plus X-Webhook-Signature when Wasender gave us a secret.
 * Nothing from the message body is stored or logged.
 */
export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return json({ error: 'غير موجود' }, 404);
  const text = await req.text();
  if (text.length > MAX_BODY) return json({ error: 'حجم الطلب كبير جداً' }, 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'البيانات غير صحيحة' }, 400);
  }
  try {
    const status = await handleWasenderWebhook(token, req.headers.get('x-webhook-signature'), body);
    return json(status === 200 ? { ok: true } : { error: status === 404 ? 'غير موجود' : 'غير مصرّح' }, status);
  } catch (e) {
    console.error('[wasender] webhook failed', e instanceof Error ? e.name : 'error');
    return json({ error: 'حدث خطأ، أعد المحاولة' }, 500);
  }
}
