import 'server-only';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { CANCEL_REASONS, NEXT_EVENT, ORDER_FLOW, type CancelReason } from '@/lib/constants';
import { calcTotals } from '@/lib/orders';
import type { OrderBody } from '@/lib/validation/orders';
import { HttpError } from './api';
import { orderDTO } from './dto';
import type { BusinessRow } from './business';
import { stubSend } from './send';

const t = schema;
type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

async function ownerName(businessId: string): Promise<string> {
  const [m] = await db().select({ name: t.teamMembers.name }).from(t.teamMembers).where(and(eq(t.teamMembers.businessId, businessId), eq(t.teamMembers.role, 'owner'))).limit(1);
  return m?.name || 'المالك';
}

/** Lines priced from the catalog (variant price when a variant is chosen); the client's numbers are never trusted. */
async function priceLines(x: Tx, businessId: string, lines: OrderBody['lines']) {
  const ids = [...new Set(lines.map((l) => l.itemId))];
  const items = await x.select().from(t.catalogItems).where(and(eq(t.catalogItems.businessId, businessId), inArray(t.catalogItems.id, ids), isNull(t.catalogItems.deletedAt), eq(t.catalogItems.kind, 'product')));
  const by = new Map(items.map((i) => [i.id, i]));
  return lines.map((l, position) => {
    const p = by.get(l.itemId);
    if (!p) throw new HttpError(404, 'غير موجود');
    const v = l.variant ? p.variants.find((y) => y.name === l.variant) : undefined;
    if (l.variant && !v) throw new HttpError(400, 'البيانات غير صحيحة');
    return { itemId: p.id, name: v ? `${p.name} · ${v.name}` : p.name, unitPriceMinor: v ? v.priceMinor : p.priceMinor, qty: l.qty, position };
  });
}

async function resolveDelivery(x: Tx, business: BusinessRow, b: OrderBody) {
  if (b.pickup) return { area: null, pickup: true as const };
  const [a] = await x.select().from(t.deliveryAreas).where(and(eq(t.deliveryAreas.id, b.areaId!), eq(t.deliveryAreas.businessId, business.id))).limit(1);
  if (!a) throw new HttpError(404, 'غير موجود');
  return { area: a, pickup: false as const };
}

export async function orderFull(businessId: string, id: string) {
  const d = db();
  const [o] = await d.select().from(t.orders).where(and(eq(t.orders.id, id), eq(t.orders.businessId, businessId))).limit(1);
  if (!o) throw new HttpError(404, 'غير موجود');
  const [items, events] = await Promise.all([d.select().from(t.orderItems).where(eq(t.orderItems.orderId, id)).orderBy(asc(t.orderItems.position)), d.select().from(t.orderEvents).where(eq(t.orderEvents.orderId, id))]);
  return orderDTO(o, items, events);
}

export async function createOrder(business: BusinessRow, b: OrderBody) {
  const who = await ownerName(business.id);
  const id = await db().transaction(async (tx) => {
    const lines = await priceLines(tx, business.id, b.lines);
    const { area, pickup } = await resolveDelivery(tx, business, b);
    const totals = calcTotals(lines, area ? { feeMinor: area.feeMinor } : null, pickup, business.freeOverMinor);
    const [n] = await tx.update(t.businesses).set({ nextOrderNo: sql`${t.businesses.nextOrderNo} + 1` }).where(eq(t.businesses.id, business.id)).returning({ next: t.businesses.nextOrderNo });
    const [o] = await tx
      .insert(t.orders)
      .values({
        businessId: business.id,
        number: n.next - 1,
        customerName: b.customer,
        customerPhone: b.phone,
        source: 'owner',
        pickup,
        areaId: area?.id ?? null,
        areaName: area?.name ?? '',
        address: pickup ? '' : b.address,
        notes: b.notes,
        subtotalMinor: totals.subtotal,
        deliveryFeeMinor: totals.fee,
        totalMinor: totals.total,
      })
      .returning({ id: t.orders.id });
    await tx.insert(t.orderItems).values(lines.map((l) => ({ ...l, orderId: o.id })));
    await tx.insert(t.orderEvents).values({ orderId: o.id, kind: 'owner', text: `${who} أضاف الطلب`, actorName: who });
    return o.id;
  });
  return orderFull(business.id, id);
}

export async function editOrder(business: BusinessRow, id: string, b: OrderBody) {
  const who = await ownerName(business.id);
  await db().transaction(async (tx) => {
    const [cur] = await tx.select().from(t.orders).where(and(eq(t.orders.id, id), eq(t.orders.businessId, business.id))).limit(1);
    if (!cur) throw new HttpError(404, 'غير موجود');
    if (cur.status === 'delivered' || cur.status === 'cancelled') throw new HttpError(409, 'لا يمكن تعديل طلب منتهٍ');
    const lines = await priceLines(tx, business.id, b.lines);
    const { area, pickup } = await resolveDelivery(tx, business, b);
    const totals = calcTotals(lines, area ? { feeMinor: area.feeMinor } : null, pickup, business.freeOverMinor);
    await tx
      .update(t.orders)
      .set({
        customerName: b.customer,
        customerPhone: b.phone,
        pickup,
        areaId: area?.id ?? null,
        areaName: area?.name ?? '',
        address: pickup ? '' : b.address,
        notes: b.notes,
        subtotalMinor: totals.subtotal,
        deliveryFeeMinor: totals.fee,
        totalMinor: totals.total,
        updatedAt: new Date(),
      })
      .where(eq(t.orders.id, id));
    await tx.delete(t.orderItems).where(eq(t.orderItems.orderId, id));
    await tx.insert(t.orderItems).values(lines.map((l) => ({ ...l, orderId: id })));
    await tx.insert(t.orderEvents).values({ orderId: id, kind: 'owner', text: `${who} عدّل الطلب`, actorName: who });
  });
  return orderFull(business.id, id);
}

export async function advanceOrder(business: BusinessRow, id: string) {
  const who = await ownerName(business.id);
  const [cur] = await db().select().from(t.orders).where(and(eq(t.orders.id, id), eq(t.orders.businessId, business.id))).limit(1);
  if (!cur) throw new HttpError(404, 'غير موجود');
  const i = ORDER_FLOW.indexOf(cur.status);
  if (i < 0 || i >= ORDER_FLOW.length - 1) throw new HttpError(409, 'لا يمكن تنفيذ هذا الإجراء على الطلب');
  const next = ORDER_FLOW[i + 1];
  await db().transaction(async (tx) => {
    await tx.update(t.orders).set({ status: next, isDraft: false, updatedAt: new Date(), ...(next === 'delivered' ? { deliveredAt: new Date() } : {}) }).where(eq(t.orders.id, id));
    await tx.insert(t.orderEvents).values({ orderId: id, kind: next === 'delivered' ? 'done' : 'owner', text: NEXT_EVENT[next]!, actorName: who });
  });
  stubSend(`order-${next}`, business.id);
  return orderFull(business.id, id);
}

export async function cancelOrder(business: BusinessRow, id: string, reason: CancelReason) {
  const who = await ownerName(business.id);
  const [cur] = await db().select().from(t.orders).where(and(eq(t.orders.id, id), eq(t.orders.businessId, business.id))).limit(1);
  if (!cur) throw new HttpError(404, 'غير موجود');
  if (cur.status === 'delivered' || cur.status === 'cancelled') throw new HttpError(409, 'لا يمكن تنفيذ هذا الإجراء على الطلب');
  const text = CANCEL_REASONS.find((r) => r.k === reason)!.text;
  await db().transaction(async (tx) => {
    await tx.update(t.orders).set({ status: 'cancelled', isDraft: false, cancelReason: reason, updatedAt: new Date() }).where(eq(t.orders.id, id));
    await tx.insert(t.orderEvents).values({ orderId: id, kind: 'cancel', text: `أُلغي الطلب: ${text}`, actorName: who });
  });
  stubSend('order-cancelled', business.id);
  return orderFull(business.id, id);
}
