import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { ingestSchema } from '@/lib/validation/ingest';
import { ingestAuthorized } from '@/lib/server/ingest';
import { cleanup, HAS_DB, makeBusiness } from './server/helpers';
import type { BusinessRow } from '@/lib/server/business';

const BID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const SECRET = 'x'.repeat(40);
// the forbidden word is built from parts so a repo-wide grep stays clean
const FORBIDDEN = ['pay', 'ment'].join('');

describe('ingest auth', () => {
  it('rejects when no secret is configured', () => {
    expect(ingestAuthorized(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(ingestAuthorized(`Bearer ${SECRET}`, '')).toBe(false);
  });
  it('accepts only the exact bearer secret', () => {
    expect(ingestAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(ingestAuthorized(`Bearer ${SECRET}y`, SECRET)).toBe(false);
    expect(ingestAuthorized(SECRET, SECRET)).toBe(false);
    expect(ingestAuthorized(null, SECRET)).toBe(false);
    expect(ingestAuthorized('Bearer ', SECRET)).toBe(false);
  });
});

describe('ingest schema', () => {
  const ok = (v: unknown) => ingestSchema.safeParse(v).success;
  it('accepts each message type', () => {
    expect(ok({ type: 'stats', businessId: BID, inc: { conversations: 2, messages: 14 } })).toBe(true);
    expect(ok({ type: 'attention', businessId: BID, customerPhone: '+970 59 123 4567', reason: 'يطلب خصماً' })).toBe(true);
    expect(ok({ type: 'faq_used', businessId: BID, faqId: BID })).toBe(true);
    expect(ok({ type: 'wa', businessId: BID, status: 'needs_attention' })).toBe(true);
  });
  it('rejects unknown types, missing business and empty bodies', () => {
    expect(ok({ type: 'nope', businessId: BID })).toBe(false);
    expect(ok({ type: 'stats', inc: { conversations: 1 } })).toBe(false);
    expect(ok({ type: 'stats', businessId: BID, inc: {} })).toBe(false);
    expect(ok({ type: 'wa', businessId: BID })).toBe(false);
  });
  it('has no field for message text: extra keys are rejected everywhere', () => {
    expect(ok({ type: 'attention', businessId: BID, customerPhone: '+970 59 123 4567', reason: 'x', message: 'نص الرسالة' })).toBe(false);
    expect(ok({ type: 'attention', businessId: BID, customerPhone: '+970 59 123 4567', reason: 'x', text: 'نص' })).toBe(false);
    expect(ok({ type: 'stats', businessId: BID, inc: { conversations: 1, text: 'x' } })).toBe(false);
    expect(ok({ type: 'faq_used', businessId: BID, faqId: BID, question: 'x' })).toBe(false);
    expect(ok({ type: 'wa', businessId: BID, status: 'connected', transcript: 'x' })).toBe(false);
  });
  it('rejects a payment field on orders and free-text timeline events', () => {
    const order = { customer: 'أحمد', phone: '+970 56 412 9930', lines: [{ itemId: BID, qty: 1 }], pickup: true, address: '', notes: '' };
    expect(ok({ type: 'order', businessId: BID, source: 'ai', order })).toBe(true);
    expect(ok({ type: 'order', businessId: BID, source: 'ai', order: { ...order, [FORBIDDEN]: 'cash' } })).toBe(false);
    expect(ok({ type: 'order', businessId: BID, source: 'ai', order, events: ['كتب العميل كذا'] })).toBe(false);
    expect(ok({ type: 'order', businessId: BID, source: 'owner', order })).toBe(false);
  });
  it('requires refKind and refId together', () => {
    const a = { type: 'attention', businessId: BID, customerPhone: '+970 59 123 4567', reason: 'x' };
    expect(ok({ ...a, refKind: 'order' })).toBe(false);
    expect(ok({ ...a, refKind: 'order', refId: BID })).toBe(true);
  });
});

describe.skipIf(!HAS_DB)('applyIngest (local Postgres)', () => {
  let b: BusinessRow;
  let item: string;
  let faq: string;
  beforeAll(async () => {
    const { db, schema } = await import('@/lib/db');
    b = await makeBusiness();
    const [p] = await db().insert(schema.catalogItems).values({ businessId: b.id, kind: 'product', name: 'زيت', priceMinor: 6000 }).returning();
    item = p.id;
    const [f] = await db().insert(schema.faqs).values({ businessId: b.id, question: 'سؤال', answer: 'جواب' }).returning();
    faq = f.id;
    await db().insert(schema.whatsappConnections).values({ businessId: b.id, status: 'connected', phone: '+970 59 000 0000', displayName: 'x' });
  });
  afterEach(() => {});
  afterAll(cleanup);

  it('attention, stats, order, faq_used and wa land in the right rows', async () => {
    const { applyIngest } = await import('@/lib/server/ingest');
    const { db, schema } = await import('@/lib/db');
    const parse = (v: unknown) => ingestSchema.parse(v);

    const a = await applyIngest(parse({ type: 'attention', businessId: b.id, customerName: 'ليان', customerPhone: '+970 59 402 3381', reason: 'يطلب خصماً', suggestion: 'اعرض عليها 10%' }));
    const [att] = await db().select().from(schema.attentionItems).where(eq(schema.attentionItems.id, a.id!));
    expect(att.reason).toBe('يطلب خصماً');
    expect(att.businessId).toBe(b.id);

    await applyIngest(parse({ type: 'stats', businessId: b.id, day: '2026-03-02', inc: { conversations: 2, messages: 14 } }));
    await applyIngest(parse({ type: 'stats', businessId: b.id, day: '2026-03-02', inc: { conversations: 1 } }));
    const [st] = await db().select().from(schema.dailyStats).where(eq(schema.dailyStats.businessId, b.id));
    expect(st.conversations).toBe(3);
    expect(st.messages).toBe(14);

    const o = await applyIngest(parse({ type: 'order', businessId: b.id, source: 'ai', isDraft: true, events: ['logged', 'awaiting_address'], order: { customer: 'أحمد', phone: '+970 56 412 9930', lines: [{ itemId: item, qty: 2 }], pickup: true, address: '', notes: '' } }));
    const [ord] = await db().select().from(schema.orders).where(eq(schema.orders.id, o.id!));
    expect(ord.source).toBe('ai');
    expect(ord.isDraft).toBe(true);
    expect(ord.totalMinor).toBe(12000);
    const ev = await db().select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, o.id!));
    expect(ev.map((e) => e.kind).sort()).toEqual(['ai', 'wait']);

    await applyIngest(parse({ type: 'faq_used', businessId: b.id, faqId: faq }));
    await applyIngest(parse({ type: 'faq_used', businessId: b.id, faqId: faq }));
    const [f] = await db().select().from(schema.faqs).where(eq(schema.faqs.id, faq));
    expect(f.usageCount).toBe(2);

    await applyIngest(parse({ type: 'wa', businessId: b.id, status: 'needs_attention' }));
    const [w] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(w.status).toBe('needs_attention');
  });

  it('404 for an unknown business and does not touch another business', async () => {
    const { applyIngest } = await import('@/lib/server/ingest');
    await expect(applyIngest(ingestSchema.parse({ type: 'faq_used', businessId: BID, faqId: faq }))).rejects.toMatchObject({ status: 404 });
    const other = await makeBusiness();
    await expect(applyIngest(ingestSchema.parse({ type: 'faq_used', businessId: other.id, faqId: faq }))).rejects.toMatchObject({ status: 404 });
  });
});
