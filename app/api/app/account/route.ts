import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { accountPatchSchema } from '@/lib/validation/account';

/** After-hours behaviour and which dashboard sections are visible. */
export const PATCH = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, accountPatchSchema);
  const set: Partial<typeof schema.businesses.$inferInsert> = { updatedAt: new Date() };
  if (b.afterHours) set.afterHours = b.afterHours;
  if (b.sections) set.sections = b.sections;
  const [row] = await db().update(schema.businesses).set(set).where(eq(schema.businesses.id, business.id)).returning({ afterHours: schema.businesses.afterHours, sections: schema.businesses.sections });
  return json(row);
});
