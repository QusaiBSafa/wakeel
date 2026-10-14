// Landing-page order form validation (the /api/order endpoint). Dashboard validation lives in lib/validation/*.

/** Same cleaning as api/order.js: strip control characters, trim, cap length. */
export const clean = (v: unknown, max: number): string =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

const ORDER_PHONE_RE = /^[+\d][\d\s\-()]{5,28}$/;

export function validateOrder(body: Record<string, unknown>) {
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const description = clean(body.description, 1000);
  if (!name) return { error: 'الرجاء إدخال الاسم.' } as const;
  if (!ORDER_PHONE_RE.test(phone)) return { error: 'الرجاء إدخال رقم هاتف صحيح.' } as const;
  return { name, phone, description } as const;
}
