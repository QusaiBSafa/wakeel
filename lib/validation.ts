import { z } from 'zod';
import { CATEGORY_KEYS, CURRENCY_KEYS, PAYMENT_KEYS, MAX_RANGES_PER_DAY } from './constants';
import { isHHMM, rangeError } from './slots';
import { parsePriceToMinor } from './money';

/** Same cleaning as api/order.js: strip control characters, trim, cap length. */
export const clean = (v: unknown, max: number): string =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

/** Like clean() but for single-line fields: also folds newlines and tabs into spaces. */
const cleanLine = (v: unknown, max: number) => clean(String(v ?? '').replace(/[\r\n\t]+/g, ' '), max);

const line = (max: number) => z.preprocess((v) => cleanLine(v, max), z.string());
const text = (max: number) => z.preprocess((v) => clean(v, max), z.string());

export const PHONE_RE = /^[+\d][\d\s\-()]{5,28}$/;

export const phoneSchema = line(30).refine((v) => v === '' || PHONE_RE.test(v), { message: 'رقم الهاتف مش صحيح' });

export const httpsUrl = line(300).refine((v) => v === '' || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), {
  message: 'الرابط لازم يبلّش بـ https://',
});

/** Instagram/TikTok handle or a link. Kept permissive; Hudhud only repeats it to customers. */
const socialHandle = line(120).refine((v) => v === '' || /^[@\w.\-/:?=&%#]+$/.test(v), { message: 'الحساب مش مكتوب صح' });

// ---------- order (landing page) ----------
export function validateOrder(body: Record<string, unknown>) {
  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const description = clean(body.description, 1000);
  if (!name) return { error: 'الرجاء إدخال الاسم.' } as const;
  if (!PHONE_RE.test(phone)) return { error: 'الرجاء إدخال رقم هاتف صحيح.' } as const;
  return { name, phone, description } as const;
}

// ---------- business ----------
export const createBusinessSchema = z.object({
  name: line(80).refine((v) => v.length > 0, { message: 'اكتب اسم الشركة عشان نكمّل' }),
  category: z.enum(CATEGORY_KEYS).default('other'),
  phone: phoneSchema.default(''),
});

export const updateBusinessSchema = z
  .object({
    name: line(80).refine((v) => v.length > 0, { message: 'اسم الشركة مطلوب' }),
    category: z.enum(CATEGORY_KEYS),
    description: text(500),
    address: line(200),
    mapUrl: httpsUrl,
    phone: phoneSchema,
    socials: z
      .object({
        instagram: socialHandle,
        facebook: socialHandle,
        tiktok: socialHandle,
        website: httpsUrl,
      })
      .partial(),
    paymentMethods: z.array(z.enum(PAYMENT_KEYS)).max(PAYMENT_KEYS.length),
    delivery: z
      .object({
        enabled: z.boolean(),
        areas: line(200),
        fee: line(12).refine((v) => v === '' || parsePriceToMinor(v) !== null || v === '0', { message: 'اكتب رقم صحيح' }),
        time: line(80),
      })
      .partial(),
    hoursMode: z.enum(['booking', 'custom']),
    hoursText: text(500),
    onboardingStep: z.number().int().min(0).max(4),
    onboarded: z.literal(true),
    logo: z.object({ url: z.string().url().max(500), pathname: z.string().max(300) }).nullable(),
  })
  .partial()
  .strict();

// ---------- products ----------
export const productSchema = z
  .object({
    name: line(80).refine((v) => v.length > 0, { message: 'اكتب اسم المنتج' }),
    price: z
      .union([z.string(), z.number()])
      .transform((v, ctx) => {
        const minor = parsePriceToMinor(String(v));
        if (minor === null) {
          ctx.addIssue({ code: 'custom', message: String(v).trim() ? 'السعر لازم يكون رقم أكبر من صفر' : 'اكتب السعر' });
          return z.NEVER;
        }
        return minor;
      }),
    currency: z.enum(CURRENCY_KEYS).default('ILS'),
    sku: line(40)
      .refine((v) => v === '' || /^[\w.\-]+$/.test(v), { message: 'الرمز بالأحرف الإنجليزية والأرقام بس' })
      .default(''),
    description: text(500).default(''),
    image: z.object({ url: z.string().url().max(500), pathname: z.string().max(300) }).nullable().optional(),
  })
  .strict();

// ---------- booking ----------
const rangeSchema = z.object({ s: z.string().refine(isHHMM), e: z.string().refine(isHHMM) });
const daySchema = z.object({
  on: z.boolean(),
  ranges: z.array(rangeSchema).min(1).max(MAX_RANGES_PER_DAY),
});

export const bookingSchema = z
  .object({
    enabled: z.boolean(),
    slotMinutes: z.number().int().min(5).max(480),
    bufferMinutes: z.number().int().min(0).max(120),
    days: z.array(daySchema).length(7),
  })
  .strict()
  .superRefine((v, ctx) => {
    v.days.forEach((d, i) => {
      d.ranges.forEach((_, j) => {
        const err = rangeError(d.ranges, j);
        if (err) ctx.addIssue({ code: 'custom', path: ['days', i, 'ranges', j], message: err });
      });
    });
  });

export const closureSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'اختار التاريخ' }).refine((d) => !Number.isNaN(Date.parse(d + 'T12:00:00Z')), {
      message: 'اختار التاريخ',
    }),
    note: line(100).default(''),
  })
  .strict();

// ---------- FAQ ----------
export const faqCreateSchema = z
  .object({
    question: line(200).refine((v) => v.length > 0, { message: 'اكتب السؤال' }),
    answer: text(1000).default(''),
    // used by "undo delete" to put a template question back where it was
    templateKey: z.string().max(40).nullable().optional(),
    position: z.number().int().min(0).max(100000).optional(),
    status: z.enum(['open', 'answered', 'skipped']).optional(),
  })
  .strict();

export const faqUpdateSchema = z
  .object({
    answer: text(1000),
    status: z.enum(['open', 'answered', 'skipped']),
  })
  .partial()
  .strict();

export const notifySchema = z.object({ feature: z.enum(['whatsapp']) }).strict();

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message || 'البيانات مش صحيحة';
}
