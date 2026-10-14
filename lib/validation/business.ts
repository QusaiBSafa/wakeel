import { z } from 'zod';
import { BUSINESS_TYPE_KEYS, ETA_OPTIONS } from '../constants';
import { MSG, fee, httpsUrl, line, optionalPhone, phone, requiredLine, text } from './common';

const social = line(120).refine((v) => v === '' || /^[@\w.\-/:?=&%#]+$/.test(v), { message: MSG.invalid });

// One schema per section of the business page; `section` selects which fields may be sent.
export const businessPatchSchema = z.discriminatedUnion('section', [
  z.object({ section: z.literal('basic'), name: requiredLine(80), type: z.enum(BUSINESS_TYPE_KEYS), description: text(500) }).strict(),
  z.object({ section: z.literal('location'), address: requiredLine(200), landmark: line(120), mapUrl: httpsUrl, parking: line(120) }).strict(),
  z.object({ section: z.literal('contact'), phone, instagram: social, facebook: social, website: httpsUrl }).strict(),
  z.object({ section: z.literal('policy'), returnsPolicy: text(500), cancelPolicy: text(500) }).strict(),
]);
export type BusinessPatch = z.output<typeof businessPatchSchema>;

export const deliverySchema = z
  .object({
    enabled: z.boolean(),
    freeOver: z.union([z.string(), z.number()]).nullable(),
    areas: z
      .array(
        z
          .object({
            id: z.string().uuid().optional(),
            name: requiredLine(60, 'اكتب اسم كل منطقة قبل الحفظ'),
            fee,
            eta: z.enum(ETA_OPTIONS),
          })
          .strict(),
      )
      .max(30),
  })
  .partial()
  .strict();

export const rulesSchema = z.object({ rules: z.array(requiredLine(200)).max(20) }).strict();

export { optionalPhone };
