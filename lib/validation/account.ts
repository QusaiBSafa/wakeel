import { z } from 'zod';
import { phone, requiredLine, uuid } from './common';

export const accountPatchSchema = z
  .object({
    afterHours: z.enum(['reply', 'away']),
    sections: z.object({ orders: z.boolean(), bookings: z.boolean(), products: z.boolean(), services: z.boolean(), delivery: z.boolean() }).strict(),
  })
  .partial()
  .strict();

export const teamCreateSchema = z.object({ name: requiredLine(60, 'اكتب الاسم'), phone, role: z.enum(['admin', 'staff', 'book']) }).strict();
export const teamPatchSchema = z.object({ role: z.enum(['admin', 'staff', 'book']) }).strict();

export const waVerifySchema = z.object({ phone: requiredLine(30), code: z.string().regex(/^\d{6}$/, { message: 'الرمز مكوّن من 6 أرقام' }) }).strict();

export const waPairSchema = z.object({ phone }).strict();

export { uuid };
