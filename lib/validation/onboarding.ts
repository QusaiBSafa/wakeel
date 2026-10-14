import { z } from 'zod';
import { BUSINESS_TYPE_KEYS, DURATIONS, ETA_OPTIONS } from '../constants';
import { MSG, fee, line, minutes, phone, price, requiredLine, text, uuid } from './common';

const offers = z.object({ products: z.boolean(), services: z.boolean(), delivery: z.boolean() }).strict();

// `skipped` is accepted next to any step; "save and finish later" sends a partial payload with draft = true.
export const stepSchemas = {
  1: z.object({ type: z.enum(BUSINESS_TYPE_KEYS, { message: 'اختر نوع نشاطك للمتابعة' }), offers }).strict(),
  2: z.object({ name: requiredLine(80), city: line(60), phone, address: line(200), description: text(500) }).strict(),
  3: z
    .object({
      hours: z
        .array(z.object({ open: z.boolean(), from: minutes, to: minutes }).strict().refine((d) => !d.open || d.to > d.from, { message: 'يجب أن يكون وقت الإغلاق بعد وقت الفتح' }))
        .length(7),
    })
    .strict(),
  4: z
    .object({
      rows: z
        .array(
          z
            .object({
              id: uuid.optional(),
              kind: z.enum(['product', 'service']),
              name: requiredLine(80),
              price,
              durationMin: z.number().int().refine((n) => (DURATIONS as readonly number[]).includes(n) || (n >= 5 && n <= 480), { message: MSG.invalid }).optional(),
            })
            .strict(),
        )
        .max(50),
    })
    .strict(),
  5: z
    .object({
      zones: z.array(z.object({ name: requiredLine(60), on: z.boolean(), fee }).strict()).max(30),
      freeOver: z.union([z.string(), z.number()]).nullable(),
      eta: z.enum(ETA_OPTIONS).optional(),
    })
    .strict(),
  6: z
    .object({
      faqs: z
        .array(
          z
            .object({
              key: line(40),
              question: requiredLine(200),
              answer: text(500),
              on: z.boolean(),
            })
            .strict()
            .refine((f) => !f.on || f.answer.length > 0, { message: 'اكتب الجواب', path: ['answer'] }),
        )
        .max(20),
    })
    .strict(),
  7: z.object({}).strict(),
} as const;

export const stepBodySchema = z.object({ data: z.record(z.string(), z.unknown()).default({}), skipped: z.boolean().optional(), draft: z.boolean().optional() }).strict();
