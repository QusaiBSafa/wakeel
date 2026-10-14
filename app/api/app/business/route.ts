import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { businessInfoDTO } from '@/lib/server/dto';
import { businessPatchSchema } from '@/lib/validation/business';

/** One section at a time (basic / location / contact / policy); stamps «آخر تحديث» for that section. */
export const PATCH = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, businessPatchSchema);
  const set: Partial<typeof schema.businesses.$inferInsert> = { updatedAt: new Date(), sectionUpdated: { ...business.sectionUpdated, [b.section]: new Date().toISOString() } };
  if (b.section === 'basic') Object.assign(set, { name: b.name, type: b.type, description: b.description });
  else if (b.section === 'location') Object.assign(set, { address: b.address, landmark: b.landmark, mapUrl: b.mapUrl, parking: b.parking });
  else if (b.section === 'contact') Object.assign(set, { phone: b.phone, socials: { ...business.socials, instagram: b.instagram, facebook: b.facebook, website: b.website } });
  else Object.assign(set, { returnsPolicy: b.returnsPolicy, cancelPolicy: b.cancelPolicy });
  const [row] = await db().update(schema.businesses).set(set).where(eq(schema.businesses.id, business.id)).returning();
  return json(businessInfoDTO(row));
});
