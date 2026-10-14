import { z } from 'zod';
import { DURATIONS } from '../constants';
import { MSG, line, price, requiredLine, text, uuid } from './common';

const image = z.object({ url: z.string().url().max(500), pathname: z.string().max(300) }).strict();
const variant = z.object({ name: requiredLine(40), price }).strict();
const days = z.array(z.number().int().min(0).max(6)).max(7);

const base = z.object({
  kind: z.enum(['product', 'service']),
  name: requiredLine(80, 'اكتب الاسم'),
  description: text(500),
  price,
  variants: z.array(variant).max(10),
  stockMode: z.enum(['always', 'qty', 'out']),
  stockQty: z.number().int().min(0).max(100000).nullable(),
  active: z.boolean(),
  durationMin: z
    .number()
    .int()
    .refine((n) => (DURATIONS as readonly number[]).includes(n) || (n >= 5 && n <= 480), { message: MSG.invalid }),
  staffIds: z.array(uuid).max(20),
  days,
  image: image.nullable(),
});

export const catalogCreateSchema = base
  .partial({ description: true, variants: true, stockMode: true, stockQty: true, active: true, durationMin: true, staffIds: true, days: true, image: true })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === 'service') {
      if (!v.durationMin) ctx.addIssue({ code: 'custom', path: ['durationMin'], message: MSG.required });
      if (!v.staffIds?.length) ctx.addIssue({ code: 'custom', path: ['staffIds'], message: 'اختر موظفاً واحداً على الأقل' });
    }
    if (v.stockMode === 'qty' && (v.stockQty === null || v.stockQty === undefined)) ctx.addIssue({ code: 'custom', path: ['stockQty'], message: MSG.required });
  });

// kind is fixed once created, so it is not part of a patch
export const catalogPatchSchema = base.omit({ kind: true }).partial().strict();

export { line };
