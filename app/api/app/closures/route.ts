import { count, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, HttpError, json, parseBody, requireBusiness } from '@/lib/server/api';
import { closureSchema } from '@/lib/validation';
import { isUniqueViolation } from '@/lib/server/products';

const { closures } = schema;

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const input = await parseBody(req, closureSchema);
  const [{ n }] = await db().select({ n: count() }).from(closures).where(eq(closures.businessId, business.id));
  if (n >= 366) throw new HttpError(400, 'وصلت للحد الأقصى من الإجازات');
  try {
    const [row] = await db().insert(closures).values({ businessId: business.id, date: input.date, note: input.note }).returning();
    return json({ id: row.id, date: String(row.date), note: row.note }, 201);
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, 'هاليوم مضاف من قبل');
    throw e;
  }
});
