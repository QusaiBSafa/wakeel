import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { leaveSchema } from '@/lib/validation/bookings';

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, leaveSchema);
  const [m] = await db().select({ id: schema.teamMembers.id }).from(schema.teamMembers).where(and(eq(schema.teamMembers.id, b.memberId), eq(schema.teamMembers.businessId, business.id)));
  if (!m) throw new HttpError(404, 'غير موجود');
  const [row] = await db().insert(schema.staffLeaves).values({ businessId: business.id, memberId: b.memberId, fromDate: b.from, toDate: b.to, note: b.note }).returning();
  return json({ id: row.id, memberId: row.memberId, from: row.fromDate, to: row.toDate, note: row.note }, 201);
});
