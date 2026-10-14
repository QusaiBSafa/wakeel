import { z } from 'zod';
import { clean } from '../validation';
import { PHONE_RE, URL_RE } from '../format';
import { parsePriceToMinor } from '../money';
import { DATE_RE, isHHMM, toMin } from '../time';

export { clean };

export const MSG = {
  required: 'هذا الحقل مطلوب',
  phone: 'الرقم غير صحيح، اكتبه مع رمز الدولة',
  url: 'يجب أن يبدأ الرابط بـ https://',
  price: 'اكتب سعراً صحيحاً أكبر من صفر',
  date: 'اختر التاريخ',
  invalid: 'البيانات غير صحيحة',
} as const;

/** Single-line text: control characters stripped, newlines folded, trimmed, capped. */
export const cleanLine = (v: unknown, max: number) => clean(String(v ?? '').replace(/[\r\n\t]+/g, ' '), max);

export const line = (max: number) => z.preprocess((v) => cleanLine(v, max), z.string());
export const text = (max: number) => z.preprocess((v) => clean(v, max), z.string());
export const requiredLine = (max: number, message: string = MSG.required) => line(max).refine((v) => v.length > 0, { message });

export const phone = line(30).refine((v) => PHONE_RE.test(v), { message: MSG.phone });
export const optionalPhone = line(30).refine((v) => v === '' || PHONE_RE.test(v), { message: MSG.phone });
export const httpsUrl = line(300).refine((v) => v === '' || URL_RE.test(v), { message: MSG.url });
export const uuid = z.string().uuid({ message: MSG.invalid });
export const dateStr = z
  .string({ message: MSG.date })
  .regex(DATE_RE, { message: MSG.date })
  .refine((d) => !Number.isNaN(Date.parse(d + 'T12:00:00Z')), { message: MSG.date });

/** A price typed by the owner («70», «12.5», Arabic digits) → integer agorot. */
export const price = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const minor = parsePriceToMinor(String(v));
  if (minor === null) {
    ctx.addIssue({ code: 'custom', message: MSG.price });
    return z.NEVER;
  }
  return minor;
});

/** Like `price` but 0 is allowed (delivery fees). */
export const fee = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const s = String(v).trim();
  if (s === '' || s === '0') return 0;
  const minor = parsePriceToMinor(s);
  if (minor === null) {
    ctx.addIssue({ code: 'custom', message: MSG.price });
    return z.NEVER;
  }
  return minor;
});

export const hhmm = z.string().refine(isHHMM, { message: MSG.invalid });
export const minutes = hhmm.transform(toMin);

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || MSG.invalid;
}
