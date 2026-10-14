import { count, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { MAX_TEAM_MEMBERS } from '@/lib/constants';
import { memberDTO } from '@/lib/server/dto';
import { stubSend } from '@/lib/server/send';
import { teamCreateSchema } from '@/lib/validation/account';

/** Invite a member. STUB: the row is real (status pending), nothing is sent and the invitee cannot sign in yet. */
export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const b = await parseBody(req, teamCreateSchema);
  const [n] = await db().select({ n: count() }).from(schema.teamMembers).where(eq(schema.teamMembers.businessId, business.id));
  if ((n?.n ?? 0) >= MAX_TEAM_MEMBERS) throw new HttpError(409, 'وصلت إلى الحد الأقصى لأعضاء الفريق في باقتك');
  const [row] = await db()
    .insert(schema.teamMembers)
    .values({ businessId: business.id, name: b.name, phone: b.phone, role: b.role, status: 'pending', color: ((n?.n ?? 0) * 3 + 1) % 8, providesServices: true })
    .returning();
  stubSend('team-invite', business.id);
  return json(memberDTO(row), 201);
});
