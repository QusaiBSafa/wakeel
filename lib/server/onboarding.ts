import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { db, schema } from '@/lib/db';
import { stepSchemas } from '@/lib/validation/onboarding';
import { firstError } from '@/lib/validation/common';
import { bookableMembers } from '@/lib/team';
import { parsePriceToMinor } from '@/lib/money';
import { HttpError } from './api';
import { createBusiness, findBusiness, type BusinessRow } from './business';
import { membersFor } from './loaders/shared';

const t = schema;
const stamp = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, new Date().toISOString()]));

type Body = { data: Record<string, unknown>; skipped?: boolean; draft?: boolean };

/** Save one onboarding step and move the saved progress. Returns the (possibly just created) business id. */
export async function saveStep(userId: string, n: number, body: Body): Promise<{ businessId: string; rowIds?: string[] }> {
  if (!Number.isInteger(n) || n < 1 || n > 7) throw new HttpError(404, 'غير موجود');
  let business = await findBusiness(userId);
  const skipped = body.skipped === true;
  const draft = body.draft === true;
  const schemaN = stepSchemas[n as 1 | 2 | 3 | 4 | 5 | 6 | 7];

  // A skipped step carries no data. A draft ("save and finish later") saves what is valid.
  let data: Record<string, unknown> | null = null;
  if (!skipped) {
    const r = schemaN.safeParse(body.data);
    if (r.success) data = r.data as Record<string, unknown>;
    else if (!draft) throw new HttpError(400, firstError(r.error));
  }
  if (n === 2 && !data && draft && !skipped) data = lenientInfo(body.data);

  if (!business) {
    if (n !== 1) throw new HttpError(400, 'ابدأ من الخطوة الأولى');
    if (!data) {
      if (draft) throw new HttpError(400, 'اختر نوع نشاطك للمتابعة');
      throw new HttpError(400, 'اختر نوع نشاطك للمتابعة');
    }
    const d = data as { type: BusinessRow['type']; offers: BusinessRow['offers'] };
    business = await createBusiness(userId, { type: d.type, offers: d.offers, sections: sectionsOf(d.offers) }, await currentUser());
  }
  const b = business;
  let savedRowIds: string[] | undefined;

  await db().transaction(async (tx) => {
    const patch: Partial<typeof t.businesses.$inferInsert> = {};
    let rowIds = b.onboarding.rowIds;
    if (data) {
      if (n === 1) {
        const d = data as { type: BusinessRow['type']; offers: BusinessRow['offers'] };
        Object.assign(patch, { type: d.type, offers: d.offers, sections: sectionsOf(d.offers) });
      } else if (n === 2) {
        const d = data as { name: string; city: string; phone: string; address: string; description: string };
        Object.assign(patch, { name: d.name, city: d.city, phone: d.phone, address: d.address, description: d.description, sectionUpdated: { ...b.sectionUpdated, ...stamp(['basic', 'location', 'contact']) } });
      } else if (n === 3) {
        const d = data as { hours: { open: boolean; from: number; to: number }[] };
        for (let weekday = 0; weekday < 7; weekday++) {
          const h = d.hours[weekday];
          const v = { open: h.open, openMin: h.from, closeMin: Math.max(h.to, h.from + 1), breakStartMin: null, breakEndMin: null };
          await tx.insert(t.businessHours).values({ businessId: b.id, weekday, ...v }).onConflictDoUpdate({ target: [t.businessHours.businessId, t.businessHours.weekday], set: v });
        }
        patch.sectionUpdated = { ...b.sectionUpdated, ...stamp(['hours']) };
      } else if (n === 4) {
        rowIds = await saveRows(tx, b, data as { rows: RowIn[] });
        savedRowIds = rowIds;
      } else if (n === 5) {
        await saveZones(tx, b, data as { zones: { name: string; on: boolean; fee: number }[]; freeOver: string | number | null; eta?: string }, patch);
      } else if (n === 6) {
        await saveFaqs(tx, b, data as { faqs: { key: string; question: string; answer: string; on: boolean }[] });
      }
    }
    const prev = b.onboarding;
    const next = draft ? n : Math.min(n + 1, 8);
    const skippedSet = new Set(prev.skipped);
    if (skipped) skippedSet.add(n);
    else if (data && !draft) skippedSet.delete(n);
    patch.onboarding = { step: next, maxStep: Math.max(prev.maxStep, next), skipped: [...skippedSet].sort(), ...(rowIds ? { rowIds } : {}) };
    await tx.update(t.businesses).set({ ...patch, updatedAt: new Date() }).where(eq(t.businesses.id, b.id));
  });
  return { businessId: b.id, rowIds: savedRowIds };
}

function sectionsOf(o: { products: boolean; services: boolean; delivery: boolean }) {
  return { orders: o.products, bookings: o.services, products: o.products, services: o.services, delivery: o.delivery };
}

function lenientInfo(raw: Record<string, unknown>) {
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  return { name: s(raw.name, 80), city: s(raw.city, 60), phone: s(raw.phone, 30), address: s(raw.address, 200), description: s(raw.description, 500) };
}

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];
type RowIn = { id?: string; kind: 'product' | 'service'; name: string; price: number; durationMin?: number };

async function saveRows(tx: Tx, b: BusinessRow, d: { rows: RowIn[] }): Promise<string[]> {
  const prev = b.onboarding.rowIds ?? [];
  const keep = d.rows.filter((r) => r.id).map((r) => r.id!);
  // rows the wizard created earlier and the user has since removed
  const gone = prev.filter((id) => !keep.includes(id));
  if (gone.length) await tx.delete(t.catalogItems).where(and(eq(t.catalogItems.businessId, b.id), inArray(t.catalogItems.id, gone)));
  const members = await membersFor(b.id);
  const staff = bookableMembers(members);
  const ids: string[] = [];
  let position = 0;
  for (const r of d.rows) {
    const values = { kind: r.kind, name: r.name, priceMinor: r.price, durationMin: r.kind === 'service' ? r.durationMin ?? 60 : null, position: position++ };
    if (r.id && prev.includes(r.id)) {
      await tx.update(t.catalogItems).set({ ...values, updatedAt: new Date() }).where(and(eq(t.catalogItems.id, r.id), eq(t.catalogItems.businessId, b.id)));
      ids.push(r.id);
    } else {
      const [row] = await tx.insert(t.catalogItems).values({ businessId: b.id, ...values }).returning({ id: t.catalogItems.id });
      if (r.kind === 'service' && staff.length) await tx.insert(t.serviceStaff).values(staff.map((m) => ({ itemId: row.id, memberId: m.id })));
      ids.push(row.id);
    }
  }
  return ids;
}

async function saveZones(tx: Tx, b: BusinessRow, d: { zones: { name: string; on: boolean; fee: number }[]; freeOver: string | number | null; eta?: string }, patch: Partial<typeof t.businesses.$inferInsert>) {
  const on = d.zones.filter((z) => z.on);
  await tx.delete(t.deliveryAreas).where(and(eq(t.deliveryAreas.businessId, b.id), eq(t.deliveryAreas.demo, false)));
  if (on.length) await tx.insert(t.deliveryAreas).values(on.map((z, i) => ({ businessId: b.id, name: z.name, feeMinor: z.fee, eta: d.eta ?? 'يوم عمل واحد', position: i })));
  const free = d.freeOver === null || String(d.freeOver).trim() === '' ? null : parsePriceToMinor(String(d.freeOver));
  patch.freeOverMinor = free;
  patch.deliveryEnabled = on.length > 0;
  patch.sectionUpdated = { ...b.sectionUpdated, ...stamp(['delivery']) };
}

async function saveFaqs(tx: Tx, b: BusinessRow, d: { faqs: { key: string; question: string; answer: string; on: boolean }[] }) {
  const existing = await tx.select().from(t.faqs).where(and(eq(t.faqs.businessId, b.id), isNull(t.faqs.deletedAt)));
  const byKey = new Map(existing.filter((f) => f.templateKey).map((f) => [f.templateKey!, f]));
  let position = existing.length;
  for (const f of d.faqs) {
    const row = byKey.get(f.key);
    if (row) {
      await tx.update(t.faqs).set({ question: f.question, answer: f.answer, enabled: f.on, updatedAt: new Date() }).where(eq(t.faqs.id, row.id));
    } else if (f.on) {
      await tx.insert(t.faqs).values({ businessId: b.id, templateKey: f.key, question: f.question, answer: f.answer, enabled: true, position: position++ });
    }
  }
}

