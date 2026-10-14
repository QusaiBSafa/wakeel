import 'server-only';
import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { DeliveryAreaDTO } from '@/lib/types';
import type { BusinessRow } from '../business';
import { orderDTO } from '../dto';
import { catalogFor } from './shared';

const { orders, orderItems, orderEvents, deliveryAreas } = schema;

const WINDOW_DAYS = 90;
const MAX_ORDERS = 500;

export async function loadOrders(business: BusinessRow) {
  const d = db();
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000);
  const rows = await d
    .select()
    .from(orders)
    .where(and(eq(orders.businessId, business.id), gte(orders.createdAt, since)))
    .orderBy(desc(orders.createdAt))
    .limit(MAX_ORDERS);
  const ids = rows.map((o) => o.id);
  const [items, events, areas, catalog] = await Promise.all([
    ids.length ? d.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [],
    ids.length ? d.select().from(orderEvents).where(inArray(orderEvents.orderId, ids)) : [],
    d.select().from(deliveryAreas).where(eq(deliveryAreas.businessId, business.id)).orderBy(asc(deliveryAreas.position)),
    catalogFor(business.id),
  ]);
  const group = <T extends { orderId: string }>(xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) m.set(x.orderId, [...(m.get(x.orderId) ?? []), x]);
    return m;
  };
  const gi = group(items);
  const ge = group(events);
  return {
    orders: rows.map((o) => orderDTO(o, gi.get(o.id) ?? [], ge.get(o.id) ?? [])),
    areas: areas.map((a): DeliveryAreaDTO => ({ id: a.id, name: a.name, feeMinor: a.feeMinor, eta: a.eta })),
    // only what can be put in an order: active, live products
    products: catalog.filter((c) => c.kind === 'product' && c.active),
    freeOverMinor: business.freeOverMinor,
    deliveryEnabled: business.deliveryEnabled,
    now: new Date().toISOString(),
  };
}
export type OrdersData = Awaited<ReturnType<typeof loadOrders>>;
