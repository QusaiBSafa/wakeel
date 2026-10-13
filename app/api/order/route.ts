import { put } from '@vercel/blob';
import crypto from 'node:crypto';
import { validateOrder } from '@/lib/validation';

// Ported from the old api/order.js with the same validation, honeypot, Blob keys and messages.

const headers = { 'Cache-Control': 'no-store' };
const reply = (body: unknown, status: number, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { ...headers, ...extra } });

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    const parsed = text ? JSON.parse(text) : {};
    body = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    body = {};
  }
  // honeypot: bots fill hidden field; pretend success
  if (body.website) return reply({ ok: true }, 200);

  const v = validateOrder(body);
  if ('error' in v) return reply({ error: v.error }, 400);

  const createdAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const order = { id, name: v.name, phone: v.phone, description: v.description, createdAt, status: 'new' };
  // reverse-timestamp prefix so newest sorts first when listed alphabetically
  const key = `orders/${String(9999999999999 - Date.now()).padStart(13, '0')}-${id}.json`;

  try {
    await put(key, JSON.stringify(order), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
    return reply({ ok: true }, 200);
  } catch (e) {
    console.error('order save failed', e);
    return reply({ error: 'تعذّر حفظ الطلب، حاول مرة أخرى.' }, 500);
  }
}

function notAllowed() {
  return reply({ error: 'الطريقة غير مسموحة' }, 405, { Allow: 'POST' });
}
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
