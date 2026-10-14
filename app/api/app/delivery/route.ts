import { and, asc, eq, notInArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { parsePriceToMinor } from '@/lib/money';
import { deliverySchema } from '@/lib/validation/business';

const t = schema;

/** Delivery switch, free-delivery threshold and the areas table (replaced as a whole). */
export const PUT = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, deliverySchema);
  const set: Partial<typeof t.businesses.$inferInsert> = { updatedAt: new Date(), sectionUpdated: { ...business.sectionUpdated, delivery: new Date().toISOString() } };
  if (b.enabled !== undefined) set.deliveryEnabled = b.enabled;
  if (b.freeOver !== undefined) {
    const s = b.freeOver === null ? '' : String(b.freeOver).trim();
    if (s === '' || s === '0') set.freeOverMinor = null;
    else {
      const minor = parsePriceToMinor(s);
      if (minor === null) throw new HttpError(400, 'اكتب سعراً صحيحاً أكبر من صفر');
      set.freeOverMinor = minor;
    }
  }
  const d = db();
  const areas = await d.transaction(async (tx) => {
    if (b.areas) {
      const existing = await tx.select({ id: t.deliveryAreas.id }).from(t.deliveryAreas).where(eq(t.deliveryAreas.businessId, business.id));
      const own = new Set(existing.map((e) => e.id));
      const keep = b.areas.filter((a) => a.id && own.has(a.id)).map((a) => a.id!);
      if (keep.length) await tx.delete(t.deliveryAreas).where(and(eq(t.deliveryAreas.businessId, business.id), notInArray(t.deliveryAreas.id, keep)));
      else await tx.delete(t.deliveryAreas).where(eq(t.deliveryAreas.businessId, business.id));
      for (const [position, a] of b.areas.entries()) {
        if (a.id && own.has(a.id)) await tx.update(t.deliveryAreas).set({ name: a.name, feeMinor: a.fee, eta: a.eta, position }).where(eq(t.deliveryAreas.id, a.id));
        else await tx.insert(t.deliveryAreas).values({ businessId: business.id, name: a.name, feeMinor: a.fee, eta: a.eta, position });
      }
    }
    await tx.update(t.businesses).set(set).where(eq(t.businesses.id, business.id));
    return tx.select().from(t.deliveryAreas).where(eq(t.deliveryAreas.businessId, business.id)).orderBy(asc(t.deliveryAreas.position));
  });
  const [row] = await d.select().from(t.businesses).where(eq(t.businesses.id, business.id));
  return json({
    deliveryEnabled: row.deliveryEnabled,
    freeOverMinor: row.freeOverMinor,
    updated: row.sectionUpdated.delivery ?? null,
    areas: areas.map((a) => ({ id: a.id, name: a.name, feeMinor: a.feeMinor, eta: a.eta })),
  });
});
