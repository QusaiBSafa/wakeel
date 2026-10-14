import { z } from 'zod';
import { CANCEL_REASON_KEYS } from '../constants';
import { MSG, line, phone, requiredLine, text, uuid } from './common';

// Deliberately strict: any unknown key (for example a pay-method field) is a 400.
export const orderBodySchema = z
  .object({
    customer: requiredLine(80, 'اكتب اسم العميل'),
    phone,
    lines: z
      .array(
        z
          .object({
            itemId: uuid,
            variant: line(40).optional(),
            qty: z.number().int().min(1).max(99),
          })
          .strict(),
      )
      .min(1, { message: 'أضف منتجاً واحداً على الأقل' })
      .max(50),
    pickup: z.boolean(),
    areaId: uuid.nullable().optional(),
    address: line(200),
    notes: text(300),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.pickup && !v.address) ctx.addIssue({ code: 'custom', path: ['address'], message: 'اكتب العنوان ليصل الطلب' });
    if (!v.pickup && !v.areaId) ctx.addIssue({ code: 'custom', path: ['areaId'], message: MSG.required });
  });
export type OrderBody = z.output<typeof orderBodySchema>;

export const cancelOrderSchema = z.object({ reason: z.enum(CANCEL_REASON_KEYS) }).strict();
