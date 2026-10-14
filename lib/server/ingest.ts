import 'server-only';
import crypto from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { Ingest } from '@/lib/validation/ingest';
import { HttpError } from './api';
import { createBooking } from './bookings';
import { createOrder } from './orders';
import { currentMonth } from './faq-write';
import { bumpStat, type StatField } from './stats';

const t = schema;
const sha = (s: string) => crypto.createHash('sha256').update(s).digest();

/** Constant-time check of `Authorization: Bearer <secret>`. Returns false when no secret is configured. */
export function ingestAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const m = /^Bearer (.+)$/.exec(header ?? '');
  const got = m ? m[1] : '';
  return crypto.timingSafeEqual(sha(got), sha(secret));
}

/** Apply one validated bot message. Nothing here accepts or stores message text. */
export async function applyIngest(msg: Ingest): Promise<{ ok: true; id?: string }> {
  const [business] = await db().select().from(t.businesses).where(eq(t.businesses.id, msg.businessId)).limit(1);
  if (!business) throw new HttpError(404, 'غير موجود');

  switch (msg.type) {
    case 'stats': {
      for (const [k, n] of Object.entries(msg.inc)) if (n) await bumpStat(business.id, k as StatField, n, msg.day);
      return { ok: true };
    }
    case 'attention': {
      const [r] = await db()
        .insert(t.attentionItems)
        .values({ businessId: business.id, customerName: msg.customerName, customerPhone: msg.customerPhone, reason: msg.reason, refKind: msg.refKind ?? null, refId: msg.refId ?? null, suggestion: msg.suggestion || null })
        .returning({ id: t.attentionItems.id });
      return { ok: true, id: r.id };
    }
    case 'order': {
      const o = await createOrder(business, msg.order, { source: 'ai', isDraft: msg.isDraft, events: msg.events });
      return { ok: true, id: o.id };
    }
    case 'booking': {
      const b = await createBooking(business, msg.booking, 'ai');
      return { ok: true, id: b.id };
    }
    case 'faq_used': {
      const month = currentMonth();
      const r = await db()
        .update(t.faqs)
        .set({ usageCount: sql`case when ${t.faqs.usageMonth} = ${month} then ${t.faqs.usageCount} + 1 else 1 end`, usageMonth: month })
        .where(and(eq(t.faqs.id, msg.faqId), eq(t.faqs.businessId, business.id)))
        .returning({ id: t.faqs.id });
      if (!r.length) throw new HttpError(404, 'غير موجود');
      return { ok: true };
    }
    case 'wa': {
      const r = await db()
        .update(t.whatsappConnections)
        .set({
          ...(msg.status ? { status: msg.status } : {}),
          ...(msg.status === 'disconnected' ? { disconnectedAt: new Date() } : {}),
          ...(msg.lastReplyAt ? { lastReplyAt: new Date(msg.lastReplyAt) } : {}),
        })
        .where(eq(t.whatsappConnections.businessId, business.id))
        .returning({ id: t.whatsappConnections.businessId });
      if (!r.length) throw new HttpError(404, 'غير موجود');
      return { ok: true };
    }
  }
}
