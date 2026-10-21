import 'server-only';
import { mediaUrl } from './business';
import type { Business, CatalogItem, Faq, TeamMember } from '@/lib/db/schema';
import type { schema } from '@/lib/db';
import type { AttentionDTO, BookingDTO, BusinessInfoDTO, CatalogItemDTO, DailyStatsDTO, FaqDTO, HoursDTO, MemberDTO, OrderDTO, WhatsAppDTO } from '@/lib/types';

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export function memberDTO(m: TeamMember): MemberDTO {
  return { id: m.id, name: m.name, phone: m.phone, email: m.email, role: m.role, status: m.status, color: m.color, providesServices: m.providesServices };
}

export function hoursDTO(h: typeof schema.businessHours.$inferSelect): HoursDTO {
  return { weekday: h.weekday, open: h.open, openMin: h.openMin, closeMin: h.closeMin, breakStartMin: h.breakStartMin, breakEndMin: h.breakEndMin };
}

export function itemDTO(p: CatalogItem, staffIds: string[] = []): CatalogItemDTO {
  return {
    id: p.id,
    kind: p.kind,
    name: p.name,
    description: p.description,
    priceMinor: p.priceMinor,
    variants: p.variants ?? [],
    stockMode: p.stockMode,
    stockQty: p.stockQty,
    active: p.active,
    durationMin: p.durationMin,
    bufferMin: p.bufferMin,
    days: p.days ?? [],
    imageUrl: mediaUrl(p.imagePathname),
    position: p.position,
    staffIds,
  };
}

export function orderDTO(o: typeof schema.orders.$inferSelect, items: (typeof schema.orderItems.$inferSelect)[], events: (typeof schema.orderEvents.$inferSelect)[]): OrderDTO {
  return {
    id: o.id,
    number: o.number,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    status: o.status,
    isDraft: o.isDraft,
    source: o.source,
    pickup: o.pickup,
    areaId: o.areaId,
    areaName: o.areaName,
    address: o.address,
    notes: o.notes,
    subtotalMinor: o.subtotalMinor,
    deliveryFeeMinor: o.deliveryFeeMinor,
    totalMinor: o.totalMinor,
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    deliveredAt: iso(o.deliveredAt),
    items: items.sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, itemId: i.itemId, name: i.name, unitPriceMinor: i.unitPriceMinor, qty: i.qty })),
    events: events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((e) => ({ id: e.id, kind: e.kind, text: e.text, actorName: e.actorName, createdAt: e.createdAt.toISOString() })),
  };
}

export function bookingDTO(b: typeof schema.bookings.$inferSelect): BookingDTO {
  return {
    id: b.id,
    number: b.number,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    itemId: b.itemId,
    serviceName: b.serviceName,
    priceMinor: b.priceMinor,
    durationMin: b.durationMin,
    bufferMin: b.bufferMin,
    memberId: b.memberId,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    source: b.source,
  };
}

export function attentionDTO(a: typeof schema.attentionItems.$inferSelect, refLabel: string | null): AttentionDTO {
  return {
    id: a.id,
    customerName: a.customerName,
    customerPhone: a.customerPhone,
    reason: a.reason,
    refKind: a.refKind === 'order' || a.refKind === 'booking' ? a.refKind : null,
    refId: a.refId,
    refLabel,
    suggestion: a.suggestion,
    status: a.status === 'replied' ? 'replied' : 'open',
    hodhodPaused: a.hodhodPaused,
    createdAt: a.createdAt.toISOString(),
  };
}

export function faqDTO(f: Faq, month: string): FaqDTO {
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    enabled: f.enabled,
    alts: f.alts ?? [],
    usageCount: f.usageMonth === month ? f.usageCount : 0,
    templateKey: f.templateKey,
    updatedAt: f.updatedAt.toISOString(),
  };
}

export function statsDTO(s: typeof schema.dailyStats.$inferSelect | undefined): DailyStatsDTO {
  return {
    conversations: s?.conversations ?? 0,
    autoReplied: s?.autoReplied ?? 0,
    ordersLogged: s?.ordersLogged ?? 0,
    bookingsConfirmed: s?.bookingsConfirmed ?? 0,
    handedOff: s?.handedOff ?? 0,
    resolved: s?.resolved ?? 0,
    messages: s?.messages ?? 0,
    replyMsTotal: s?.replyMsTotal ?? 0,
    replies: s?.replies ?? 0,
  };
}

export function waDTO(w: typeof schema.whatsappConnections.$inferSelect | undefined): WhatsAppDTO | null {
  if (!w) return null;
  return {
    status: w.status,
    phone: w.phone,
    displayName: w.displayName,
    connectedAt: iso(w.connectedAt),
    tokenExpiresAt: iso(w.tokenExpiresAt),
    disconnectedAt: iso(w.disconnectedAt),
    quality: w.quality,
    lastReplyAt: iso(w.lastReplyAt),
    isStub: w.isStub,
    provider: w.provider === 'wasender' ? 'wasender' : 'stub',
    lastInboundAt: iso(w.lastInboundAt),
  };
}

export function businessInfoDTO(b: Business): BusinessInfoDTO {
  const s = b.socials || {};
  return {
    id: b.id,
    name: b.name,
    type: b.type,
    description: b.description,
    city: b.city,
    address: b.address,
    landmark: b.landmark,
    mapUrl: b.mapUrl,
    parking: b.parking,
    phone: b.phone,
    instagram: s.instagram ?? '',
    facebook: s.facebook ?? '',
    website: s.website ?? '',
    returnsPolicy: b.returnsPolicy,
    cancelPolicy: b.cancelPolicy,
    rules: b.rules ?? [],
    deliveryEnabled: b.deliveryEnabled,
    freeOverMinor: b.freeOverMinor,
    offers: b.offers,
    sections: b.sections,
    afterHours: b.afterHours,
    sectionUpdated: b.sectionUpdated ?? {},
    onboardedAt: iso(b.onboardedAt),
    createdAt: b.createdAt.toISOString(),
  };
}

/** WhatsApp state for the sidebar pill: connected → on, needs attention (or token expiring within 7 days) → warn, else off. */
export function waState(w: typeof schema.whatsappConnections.$inferSelect | undefined, now = Date.now()): 'on' | 'off' | 'warn' {
  if (!w || w.status === 'disconnected') return 'off';
  if (w.status === 'needs_attention') return 'warn';
  if (w.tokenExpiresAt && w.tokenExpiresAt.getTime() < now + 7 * 86400000) return 'warn';
  return 'on';
}
