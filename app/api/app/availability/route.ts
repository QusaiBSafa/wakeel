import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { getSettings } from '@/lib/server/business';
import { hoursDTO } from '@/lib/server/dto';
import { availabilitySchema } from '@/lib/validation/bookings';

const t = schema;

/** Working hours, booking rules, service durations and holidays are saved together (the page has one dirty bar). */
export const PUT = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, availabilitySchema);
  await getSettings(business);
  const d = db();

  const ids = b.services.map((s) => s.id);
  if (ids.length) {
    const own = await d.select({ id: t.catalogItems.id }).from(t.catalogItems).where(and(eq(t.catalogItems.businessId, business.id), eq(t.catalogItems.kind, 'service'), inArray(t.catalogItems.id, ids)));
    if (own.length !== new Set(ids).size) throw new HttpError(404, 'غير موجود');
  }

  await d.transaction(async (tx) => {
    const existing = await tx.select().from(t.businessHours).where(eq(t.businessHours.businessId, business.id));
    for (const h of b.hours) {
      const prev = existing.find((e) => e.weekday === h.weekday);
      // a closed day keeps its previous times so re-opening restores them
      const v = h.open
        ? { open: true, openMin: h.from, closeMin: h.to, breakStartMin: h.breakFrom, breakEndMin: h.breakTo }
        : { open: false, openMin: prev?.openMin ?? 540, closeMin: prev?.closeMin ?? 1140, breakStartMin: prev?.breakStartMin ?? null, breakEndMin: prev?.breakEndMin ?? null };
      await tx.insert(t.businessHours).values({ businessId: business.id, weekday: h.weekday, ...v }).onConflictDoUpdate({ target: [t.businessHours.businessId, t.businessHours.weekday], set: v });
    }
    await tx
      .update(t.bookingSettings)
      .set({ leadMinutes: b.rules.leadMinutes, horizonDays: b.rules.horizonDays, autoConfirm: b.rules.autoConfirm, updatedAt: new Date() })
      .where(eq(t.bookingSettings.businessId, business.id));
    for (const s of b.services) {
      await tx.update(t.catalogItems).set({ durationMin: s.durationMin, bufferMin: s.bufferMin, updatedAt: new Date() }).where(and(eq(t.catalogItems.id, s.id), eq(t.catalogItems.businessId, business.id)));
    }
    await tx.delete(t.closures).where(eq(t.closures.businessId, business.id));
    const seen = new Set<string>();
    const rows = b.closures.filter((c) => !seen.has(c.date) && seen.add(c.date)).map((c) => ({ businessId: business.id, date: c.date, note: c.note }));
    if (rows.length) await tx.insert(t.closures).values(rows);
    await tx.update(t.businesses).set({ sectionUpdated: { ...business.sectionUpdated, hours: new Date().toISOString() }, updatedAt: new Date() }).where(eq(t.businesses.id, business.id));
  });

  const [hours, closures, services] = await Promise.all([
    d.select().from(t.businessHours).where(eq(t.businessHours.businessId, business.id)).orderBy(asc(t.businessHours.weekday)),
    d.select().from(t.closures).where(eq(t.closures.businessId, business.id)).orderBy(asc(t.closures.date)),
    ids.length ? d.select({ id: t.catalogItems.id, durationMin: t.catalogItems.durationMin, bufferMin: t.catalogItems.bufferMin }).from(t.catalogItems).where(inArray(t.catalogItems.id, ids)) : [],
  ]);
  return json({ hours: hours.map(hoursDTO), rules: b.rules, closures: closures.map((c) => ({ id: c.id, date: c.date, note: c.note })), services });
});
