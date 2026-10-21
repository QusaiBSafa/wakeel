import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { DeliveryAreaDTO } from '@/lib/types';
import type { BusinessRow } from '../business';
import { businessInfoDTO, hoursDTO } from '../dto';

const { businessHours, deliveryAreas } = schema;

export async function loadBusiness(business: BusinessRow) {
  const d = db();
  const [hours, areas] = await Promise.all([
    d.select().from(businessHours).where(eq(businessHours.businessId, business.id)).orderBy(asc(businessHours.weekday)),
    d.select().from(deliveryAreas).where(eq(deliveryAreas.businessId, business.id)).orderBy(asc(deliveryAreas.position)),
  ]);
  return {
    info: businessInfoDTO(business),
    hours: hours.map(hoursDTO),
    areas: areas.map((a): DeliveryAreaDTO => ({ id: a.id, name: a.name, feeMinor: a.feeMinor, eta: a.eta })),
    now: new Date().toISOString(),
  };
}
export type BusinessData = Awaited<ReturnType<typeof loadBusiness>>;
