import { z } from 'zod';
import { HORIZON_OPTIONS, LEAD_OPTIONS } from '../constants';
import { MSG, dateStr, line, minutes, phone, requiredLine, uuid } from './common';

const startMin = z.number().int().min(0).max(1439);

export const bookingCreateSchema = z
  .object({ customer: requiredLine(80, 'اكتب اسم العميل'), phone, itemId: uuid, date: dateStr, startMin })
  .strict();

export const bookingRescheduleSchema = z.object({ date: dateStr, startMin }).strict();
export const bookingStatusSchema = z.object({ to: z.enum(['confirmed', 'done', 'cancelled']) }).strict();

export const slotsQuerySchema = z.object({ itemId: uuid, date: dateStr, excludeId: uuid.optional() });
export const rangeQuerySchema = z.object({ from: dateStr, to: dateStr });

const hourRow = z
  .object({
    weekday: z.number().int().min(0).max(6),
    open: z.boolean(),
    from: minutes,
    to: minutes,
    breakFrom: minutes.nullable(),
    breakTo: minutes.nullable(),
  })
  .strict()
  .superRefine((d, ctx) => {
    if (!d.open) return;
    if (d.to <= d.from) ctx.addIssue({ code: 'custom', path: ['to'], message: 'يجب أن يكون وقت الإغلاق بعد وقت الفتح' });
    if ((d.breakFrom === null) !== (d.breakTo === null) || (d.breakFrom !== null && d.breakTo !== null && !(d.from <= d.breakFrom && d.breakFrom < d.breakTo && d.breakTo <= d.to))) {
      ctx.addIssue({ code: 'custom', path: ['breakFrom'], message: 'يجب أن تكون الاستراحة ضمن ساعات العمل' });
    }
  });

export const availabilitySchema = z
  .object({
    hours: z.array(hourRow).length(7),
    rules: z
      .object({
        leadMinutes: z.number().refine((n) => (LEAD_OPTIONS as readonly number[]).includes(n), { message: MSG.invalid }),
        horizonDays: z.number().refine((n) => (HORIZON_OPTIONS as readonly number[]).includes(n), { message: MSG.invalid }),
        autoConfirm: z.boolean(),
      })
      .strict(),
    services: z.array(z.object({ id: uuid, durationMin: z.number().int().min(5).max(480), bufferMin: z.number().int().min(0).max(120) }).strict()).max(200),
    closures: z.array(z.object({ date: dateStr, note: line(100) }).strict()).max(100),
  })
  .strict();

export const leaveSchema = z
  .object({ memberId: uuid, from: dateStr, to: dateStr, note: line(100) })
  .strict()
  .refine((v) => v.to >= v.from, { message: 'تاريخ النهاية يجب أن يكون بعد البداية', path: ['to'] });
