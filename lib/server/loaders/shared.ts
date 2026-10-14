import 'server-only';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { attentionDTO, itemDTO, memberDTO } from '../dto';

const { attentionItems, orders, bookings, catalogItems, serviceStaff, teamMembers } = schema;

export const iso = (d: Date) => d.toISOString();

/** Attention rows for a business with the order/booking labels resolved (#1043 / B-101). */
export async function attentionFor(businessId: string, limit?: number) {
  const d = db();
  const q = d.select().from(attentionItems).where(eq(attentionItems.businessId, businessId)).orderBy(asc(attentionItems.createdAt));
  const rows = limit ? await q.limit(limit) : await q;
  const orderIds = rows.filter((r) => r.refKind === 'order' && r.refId).map((r) => r.refId!);
  const bookingIds = rows.filter((r) => r.refKind === 'booking' && r.refId).map((r) => r.refId!);
  const [os, bs] = await Promise.all([
    orderIds.length ? d.select({ id: orders.id, number: orders.number }).from(orders).where(and(eq(orders.businessId, businessId), inArray(orders.id, orderIds))) : [],
    bookingIds.length ? d.select({ id: bookings.id, number: bookings.number }).from(bookings).where(and(eq(bookings.businessId, businessId), inArray(bookings.id, bookingIds))) : [],
  ]);
  const on = new Map(os.map((o) => [o.id, `#${o.number}`]));
  const bn = new Map(bs.map((b) => [b.id, `B-${b.number}`]));
  return rows.map((r) => attentionDTO(r, r.refKind === 'order' ? on.get(r.refId ?? '') ?? null : r.refKind === 'booking' ? bn.get(r.refId ?? '') ?? null : null));
}

/** Live catalog items (not soft-deleted) with their staff ids. */
export async function catalogFor(businessId: string) {
  const d = db();
  const items = await d
    .select()
    .from(catalogItems)
    .where(and(eq(catalogItems.businessId, businessId), isNull(catalogItems.deletedAt)))
    .orderBy(asc(catalogItems.position), asc(catalogItems.createdAt));
  const ids = items.map((i) => i.id);
  const links = ids.length ? await d.select().from(serviceStaff).where(inArray(serviceStaff.itemId, ids)) : [];
  const byItem = new Map<string, string[]>();
  for (const l of links) byItem.set(l.itemId, [...(byItem.get(l.itemId) ?? []), l.memberId]);
  return items.map((i) => itemDTO(i, byItem.get(i.id) ?? []));
}

export async function membersFor(businessId: string) {
  const rows = await db().select().from(teamMembers).where(eq(teamMembers.businessId, businessId)).orderBy(asc(teamMembers.createdAt));
  // owner first
  return rows.sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0)).map(memberDTO);
}
