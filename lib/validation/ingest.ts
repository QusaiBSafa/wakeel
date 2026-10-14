import { z } from 'zod';
import { dateStr, line, phone, requiredLine, text, uuid } from './common';
import { orderBodySchema } from './orders';
import { bookingCreateSchema } from './bookings';

/**
 * Contract for the future WhatsApp bot. Every object is `.strict()`: there is deliberately no field for message
 * text, so the bot cannot send conversation content even by mistake. Order timeline entries are fixed keys,
 * not free text.
 */
const count = z.number().int().min(0).max(1_000_000);

const statsInc = z
  .object({
    conversations: count,
    autoReplied: count,
    ordersLogged: count,
    bookingsConfirmed: count,
    handedOff: count,
    resolved: count,
    messages: count,
    replyMsTotal: count,
    replies: count,
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'لا توجد أعداد' });

// Lenient on the version/variant nibbles: the id only has to look like a UUID, the lookup decides.
const looseUuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: 'البيانات غير صحيحة' });
const base = { businessId: looseUuid };

export const ingestSchema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('stats'), day: dateStr.optional(), inc: statsInc }).strict(),
  z
    .object({
      ...base,
      type: z.literal('attention'),
      customerName: line(80).default(''),
      customerPhone: phone,
      // A short reason written by the bot («يطلب خصماً»), never a quote of the customer's message.
      reason: requiredLine(200),
      refKind: z.enum(['order', 'booking']).nullish(),
      refId: uuid.nullish(),
      suggestion: text(300).nullish(),
    })
    .strict()
    .refine((v) => !!v.refKind === !!v.refId, { message: 'البيانات غير صحيحة', path: ['refId'] }),
  z
    .object({
      ...base,
      type: z.literal('order'),
      order: orderBodySchema,
      source: z.literal('ai'),
      isDraft: z.boolean().optional(),
      events: z.array(z.enum(['logged', 'customer_confirmed', 'awaiting_address'])).max(5).optional(),
    })
    .strict(),
  z.object({ ...base, type: z.literal('booking'), booking: bookingCreateSchema, source: z.literal('ai') }).strict(),
  z.object({ ...base, type: z.literal('faq_used'), faqId: uuid }).strict(),
  z
    .object({
      ...base,
      type: z.literal('wa'),
      status: z.enum(['connected', 'needs_attention', 'disconnected']).optional(),
      lastReplyAt: z.string().datetime().optional(),
    })
    .strict()
    .refine((v) => v.status !== undefined || v.lastReplyAt !== undefined, { message: 'لا توجد بيانات' }),
]);
export type Ingest = z.output<typeof ingestSchema>;
