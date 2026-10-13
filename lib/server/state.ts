import 'server-only';
import { and, asc, eq, inArray, notInArray, isNotNull, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { AppState, BusinessDTO, FaqDTO, ProductDTO } from '@/lib/types';
import type { Category, PaymentMethod } from '@/lib/constants';
import { faqTemplatesFor } from '@/lib/constants';
import { hhmm } from '@/lib/slots';
import { minorToInput } from '@/lib/money';

const { businesses, products, bookingSettings, availability, openDays, closures, faqs, notifyRequests } = schema;

export type BusinessRow = typeof businesses.$inferSelect;

export async function findBusiness(userId: string): Promise<BusinessRow | null> {
  const rows = await db().select().from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Photos are stored in a private Blob store and served via /media/<pathname>. */
export function mediaUrl(pathname: string | null | undefined): string | null {
  return pathname ? `/media/${pathname}` : null;
}

export function businessDTO(b: BusinessRow): BusinessDTO {
  const s = b.socials || {};
  const d = b.delivery || { enabled: false };
  return {
    name: b.name,
    category: b.category as Category,
    description: b.description,
    logoUrl: mediaUrl(b.logoPathname),
    address: b.address,
    mapUrl: b.mapUrl,
    phone: b.phone,
    socials: { instagram: s.instagram ?? '', facebook: s.facebook ?? '', tiktok: s.tiktok ?? '', website: s.website ?? '' },
    paymentMethods: (b.paymentMethods ?? []) as PaymentMethod[],
    delivery: {
      enabled: !!d.enabled,
      areas: d.areas ?? '',
      fee: d.feeMinor != null ? minorToInput(d.feeMinor) : '',
      time: d.time ?? '',
    },
    hoursMode: b.hoursMode,
    hoursText: b.hoursText,
    onboardingStep: b.onboardingStep,
    onboarded: !!b.onboardedAt,
  };
}

export function productDTO(p: typeof products.$inferSelect): ProductDTO {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    priceMinor: p.priceMinor,
    currency: p.currency,
    description: p.description,
    imageUrl: mediaUrl(p.imagePathname),
  };
}

export function faqDTO(f: typeof faqs.$inferSelect): FaqDTO {
  return { id: f.id, templateKey: f.templateKey, question: f.question, answer: f.answer, status: f.status, position: f.position };
}

export async function loadState(b: BusinessRow): Promise<AppState> {
  const d = db();
  const [prods, settings, ranges, days, cls, fq, notify] = await Promise.all([
    d.select().from(products).where(and(eq(products.businessId, b.id), isNull(products.deletedAt))).orderBy(asc(products.createdAt)),
    d.select().from(bookingSettings).where(eq(bookingSettings.businessId, b.id)).limit(1),
    d.select().from(availability).where(eq(availability.businessId, b.id)).orderBy(asc(availability.weekday), asc(availability.startMin)),
    d.select().from(openDays).where(eq(openDays.businessId, b.id)),
    d.select().from(closures).where(eq(closures.businessId, b.id)).orderBy(asc(closures.date)),
    d.select().from(faqs).where(eq(faqs.businessId, b.id)).orderBy(asc(faqs.position), asc(faqs.createdAt)),
    d.select({ id: notifyRequests.id }).from(notifyRequests).where(eq(notifyRequests.businessId, b.id)).limit(1),
  ]);
  const st = settings[0];
  const week = Array.from({ length: 7 }, (_, i) => {
    const r = ranges.filter((x) => x.weekday === i).map((x) => ({ s: hhmm(x.startMin), e: hhmm(x.endMin) }));
    const od = days.find((x) => x.weekday === i);
    return { on: od ? od.open : i !== 6, ranges: r.length ? r : [{ s: '09:00', e: '17:00' }] };
  });
  return {
    business: businessDTO(b),
    // newest first, like the prototype list
    products: prods.map(productDTO).reverse(),
    booking: {
      enabled: st?.enabled ?? false,
      slotMinutes: st?.slotMinutes ?? 30,
      bufferMinutes: st?.bufferMinutes ?? 0,
      days: week,
    },
    closures: cls.map((c) => ({ id: c.id, date: String(c.date), note: c.note })),
    faqs: fq.map(faqDTO),
    notified: notify.length > 0,
  };
}

/**
 * Bring the template FAQs in line with the business category: add missing templates for the
 * new category, and drop template questions of other categories that were never touched
 * (answered or skipped ones are kept so nothing the owner wrote is lost).
 */
export async function syncFaqTemplates(businessId: string, category: Category) {
  const d = db();
  const templates = faqTemplatesFor(category);
  const keys = templates.map((t) => t.key);
  await d
    .delete(faqs)
    .where(
      and(
        eq(faqs.businessId, businessId),
        isNotNull(faqs.templateKey),
        notInArray(faqs.templateKey, keys),
        eq(faqs.status, 'open'),
        eq(faqs.answer, ''),
      ),
    );
  const existing = await d
    .select({ key: faqs.templateKey })
    .from(faqs)
    .where(and(eq(faqs.businessId, businessId), inArray(faqs.templateKey, keys)));
  const have = new Set(existing.map((e) => e.key));
  const missing = templates.map((t, i) => ({ ...t, i })).filter((t) => !have.has(t.key));
  if (missing.length) {
    await d
      .insert(faqs)
      .values(missing.map((t) => ({ businessId, templateKey: t.key, question: t.q, position: t.i * 10 })))
      .onConflictDoNothing();
  }
}
