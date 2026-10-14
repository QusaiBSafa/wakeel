import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { parseAiConfig } from '@/lib/validation/ai';
import type { BusinessRow } from '../business';
import { aiEffective } from '../ai';
import { hoursDTO } from '../dto';
import { catalogFor, membersFor } from './shared';

const { aiSettings, businessHours } = schema;

export async function loadAi(business: BusinessRow) {
  const d = db();
  const [[row], hours, members, catalog] = await Promise.all([
    d.select().from(aiSettings).where(eq(aiSettings.businessId, business.id)).limit(1),
    d.select().from(businessHours).where(eq(businessHours.businessId, business.id)).orderBy(asc(businessHours.weekday)),
    membersFor(business.id),
    catalogFor(business.id),
  ]);
  const first = catalog.find((c) => c.active);
  return {
    config: parseAiConfig(row?.config),
    enabled: aiEffective(row),
    pausedUntil: row?.pausedUntil ? row.pausedUntil.toISOString() : null,
    business: { name: business.name, phone: business.phone },
    ownerEmail: members.find((m) => m.role === 'owner')?.email ?? '',
    hours: hours.map(hoursDTO),
    item: first ? { name: first.name, priceMinor: first.priceMinor } : null,
    offers: business.offers,
    now: new Date().toISOString(),
  };
}
export type AiData = Awaited<ReturnType<typeof loadAi>>;
