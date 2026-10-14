import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { cleanup, HAS_DB, makeBusiness } from './helpers';
import type { BusinessRow } from '@/lib/server/business';

describe.skipIf(!HAS_DB)('server loaders (local Postgres)', () => {
  let b: BusinessRow;
  let memberId: string;
  let serviceId: string;
  let productId: string;
  let areaId: string;
  const out: Record<string, unknown> = {};

  beforeAll(async () => {
    const { db, schema } = await import('@/lib/db');
    const d = db();
    b = await makeBusiness();
    const [m] = await d.insert(schema.teamMembers).values({ businessId: b.id, name: 'سارة', role: 'staff', status: 'pending', color: 1, providesServices: true }).returning();
    memberId = m.id;
    const [svc] = await d.insert(schema.catalogItems).values({ businessId: b.id, kind: 'service', name: 'قص وسشوار', priceMinor: 7000, durationMin: 45 }).returning();
    serviceId = svc.id;
    await d.insert(schema.serviceStaff).values({ itemId: svc.id, memberId });
    const [prod] = await d.insert(schema.catalogItems).values({ businessId: b.id, kind: 'product', name: 'شامبو أرغان', priceMinor: 4500, variants: [{ name: '500 مل', priceMinor: 6500 }] }).returning();
    productId = prod.id;
    const [area] = await d.insert(schema.deliveryAreas).values({ businessId: b.id, name: 'رام الله', feeMinor: 1500, eta: 'يوم عمل واحد' }).returning();
    areaId = area.id;
    const [o] = await d
      .insert(schema.orders)
      .values({ businessId: b.id, number: 1043, customerName: 'أحمد عودة', customerPhone: '+970 56 412 9930', source: 'ai', isDraft: true, areaId, areaName: 'رام الله', address: 'البيرة', subtotalMinor: 9000, deliveryFeeMinor: 1500, totalMinor: 10500 })
      .returning();
    await d.insert(schema.orderItems).values({ orderId: o.id, itemId: productId, name: 'شامبو أرغان', unitPriceMinor: 4500, qty: 2 });
    await d.insert(schema.orderEvents).values({ orderId: o.id, kind: 'ai', text: 'سجّل هُدهُد الطلب من واتساب', actorName: 'هُدهُد' });
    const start = new Date(Date.now() + 60_000); // upcoming = later today; one hour ahead would cross midnight late in the evening
    const [bk] = await d
      .insert(schema.bookings)
      .values({ businessId: b.id, number: 101, customerName: 'لينا', customerPhone: '+970 59 702 4418', itemId: serviceId, serviceName: 'قص وسشوار', priceMinor: 7000, durationMin: 45, memberId, startsAt: start, endsAt: new Date(start.getTime() + 45 * 60000), blockedUntil: new Date(start.getTime() + 45 * 60000), status: 'confirmed', source: 'ai' })
      .returning();
    await d.insert(schema.attentionItems).values({ businessId: b.id, customerName: 'أحمد', customerPhone: '+970 56 412 9930', reason: 'طلب خصماً', refKind: 'order', refId: o.id, suggestion: 'يسعدنا خدمتك' });
    await d.insert(schema.attentionItems).values({ businessId: b.id, customerPhone: '+970 59 000 0000', reason: 'استفسار', refKind: 'booking', refId: bk.id });
    await d.insert(schema.faqs).values({ businessId: b.id, question: 'هل يوجد موقف؟', answer: 'نعم', alts: ['وين أركن؟'] });
    await d.insert(schema.whatsappConnections).values({ businessId: b.id, status: 'connected', phone: '+970 59 123 4567', displayName: 'صالون لمسة', connectedAt: new Date(), tokenExpiresAt: new Date(Date.now() + 60 * 86400000), lastReplyAt: new Date() });
    const { ymd } = await import('@/lib/time');
    await d.insert(schema.dailyStats).values({ businessId: b.id, day: ymd(Date.now()), conversations: 47, autoReplied: 44, messages: 300 });
    await d.update(schema.aiSettings).set({ enabled: true }).where(eq(schema.aiSettings.businessId, b.id));
  });
  afterAll(cleanup);

  it('shell', async () => {
    const { loadShell } = await import('@/lib/server/loaders/shell');
    const s = await loadShell(b, 'سامي ناصر');
    out.shell = s;
    expect(s.wa).toBe('on');
    expect(s.counts).toEqual({ attention: 2, newOrders: 1 });
    expect(s.aiEnabled).toBe(true);
    expect(s.business.initial).toBe('ص');
    expect(s.business.onboardingDone).toBe(false);
    expect(s.business.onboardingProgress.total).toBe(8);
  });

  it('shell warns when the token expires within 7 days, and shows off when disconnected', async () => {
    const { db, schema } = await import('@/lib/db');
    const { loadShell } = await import('@/lib/server/loaders/shell');
    await db().update(schema.whatsappConnections).set({ tokenExpiresAt: new Date(Date.now() + 3 * 86400000) }).where(eq(schema.whatsappConnections.businessId, b.id));
    expect((await loadShell(b, 'x')).wa).toBe('warn');
    await db().update(schema.whatsappConnections).set({ status: 'disconnected' }).where(eq(schema.whatsappConnections.businessId, b.id));
    expect((await loadShell(b, 'x')).wa).toBe('off');
    await db().update(schema.whatsappConnections).set({ status: 'connected', tokenExpiresAt: new Date(Date.now() + 60 * 86400000) }).where(eq(schema.whatsappConnections.businessId, b.id));
  });

  it('home', async () => {
    const { loadHome } = await import('@/lib/server/loaders/home');
    const h = await loadHome(b);
    out.home = h;
    expect(h.stats.conversations).toBe(47);
    expect(h.attention).toHaveLength(2);
    expect(h.attentionCount).toBe(2);
    expect(h.newOrders).toEqual({ count: 1, totalMinor: 10500 });
    expect(h.recentOrders[0].itemsText).toBe('شامبو أرغان ×2');
    expect(h.upcoming).toHaveLength(1);
    expect(h.wa?.status).toBe('connected');
  });

  it('attention resolves refs to a readable label and carries no text fields', async () => {
    const { loadAttention } = await import('@/lib/server/loaders/attention');
    const a = await loadAttention(b);
    out.attention = a;
    expect(a.items.map((i) => i.refLabel).sort()).toEqual(['الطلب #1043 · جديد', 'حجز B-101 · قص وسشوار']);
    for (const i of a.items) expect(Object.keys(i).join()).not.toMatch(/text|message|reply|transcript/i);
  });

  it('orders', async () => {
    const { loadOrders } = await import('@/lib/server/loaders/orders');
    const o = await loadOrders(b);
    out.orders = o;
    expect(o.orders[0]).toMatchObject({ number: 1043, isDraft: true, totalMinor: 10500 });
    expect(o.orders[0].items).toHaveLength(1);
    expect(o.orders[0].events).toHaveLength(1);
    expect(o.areas[0].name).toBe('رام الله');
    expect(o.products.map((p) => p.name)).toEqual(['شامبو أرغان']);
  });

  it('bookings', async () => {
    const { loadBookings } = await import('@/lib/server/loaders/bookings');
    const k = await loadBookings(b);
    out.bookings = k;
    expect(k.hours).toHaveLength(7);
    expect(k.hours.find((h) => h.weekday === 6)?.open).toBe(false);
    expect(k.services[0].staffIds).toEqual([memberId]);
    // sara provides services, so she is the bookable member (the owner is only used when nobody else is)
    expect(k.bookableIds).toEqual([memberId]);
    expect(k.rules).toEqual({ leadMinutes: 120, horizonDays: 30, autoConfirm: true });
  });

  it('catalog', async () => {
    const { loadCatalog } = await import('@/lib/server/loaders/catalog');
    const c = await loadCatalog(b);
    out.catalog = c;
    expect(c.items).toHaveLength(2);
    expect(c.staff.map((m) => m.name)).toEqual(['سارة']);
  });

  it('business', async () => {
    const { loadBusiness } = await import('@/lib/server/loaders/business');
    const x = await loadBusiness(b);
    out.business = x;
    expect(x.info.name).toBe('صالون لمسة');
    expect(x.hours).toHaveLength(7);
    expect(x.areas).toHaveLength(1);
  });

  it('faq', async () => {
    const { loadFaq } = await import('@/lib/server/loaders/faq');
    const f = await loadFaq(b);
    out.faq = f;
    expect(f.faqs[0]).toMatchObject({ question: 'هل يوجد موقف؟', alts: ['وين أركن؟'], usageCount: 0, enabled: true });
  });

  it('ai', async () => {
    const { loadAi } = await import('@/lib/server/loaders/ai');
    const a = await loadAi(b);
    out.ai = a;
    expect(a.config.name).toBe('هُدهُد');
    expect(a.enabled).toBe(true);
    expect(a.ownerEmail).toBe('owner@example.com');
  });

  it('account', async () => {
    const { loadAccount } = await import('@/lib/server/loaders/account');
    const a = await loadAccount(b);
    out.account = a;
    expect(a.members.map((m) => m.role)).toEqual(['owner', 'staff']);
    expect(a.usage).toEqual({ conversations: 47, members: 2, items: 2 });
    expect(a.messagesThisMonth).toBe(300);
  });

  it('onboarding', async () => {
    const { loadOnboarding } = await import('@/lib/server/loaders/onboarding');
    const o = await loadOnboarding(b);
    out.onboarding = o;
    expect(o.business?.onboarding.step).toBe(1);
    expect((await loadOnboarding(null)).business).toBeNull();
  });

  it('no loader output has a payment key or value', () => {
    for (const [k, v] of Object.entries(out)) expect(JSON.stringify(v), k).not.toMatch(/pay/i);
  });
});
