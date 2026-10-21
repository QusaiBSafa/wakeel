import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { BusinessRow } from '../business';
import { businessInfoDTO, hoursDTO, waDTO } from '../dto';
import { catalogFor } from './shared';
import { waProvider } from '../wa/pairing';

const { businessHours, deliveryAreas, faqs, whatsappConnections } = schema;

/** Everything the wizard needs to resume where the user left off. `business` is null before step 1. */
export async function loadOnboarding(business: BusinessRow | null) {
  if (!business) return { business: null };
  const d = db();
  const [hours, areas, faqRows, [wa], catalog] = await Promise.all([
    d.select().from(businessHours).where(eq(businessHours.businessId, business.id)).orderBy(asc(businessHours.weekday)),
    d.select().from(deliveryAreas).where(eq(deliveryAreas.businessId, business.id)).orderBy(asc(deliveryAreas.position)),
    d.select().from(faqs).where(and(eq(faqs.businessId, business.id), isNull(faqs.deletedAt))).orderBy(asc(faqs.position)),
    d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1),
    catalogFor(business.id),
  ]);
  return {
    business: {
      info: businessInfoDTO(business),
      onboarding: business.onboarding,
      hours: hours.map(hoursDTO),
      zones: areas.map((a) => ({ id: a.id, name: a.name, feeMinor: a.feeMinor, eta: a.eta })),
      faqs: faqRows.map((f) => ({ id: f.id, key: f.templateKey, question: f.question, answer: f.answer, enabled: f.enabled })),
      wa: waDTO(wa),
      waProvider: waProvider(),
      catalog,
    },
  };
}
export type OnboardingData = Awaited<ReturnType<typeof loadOnboarding>>;
