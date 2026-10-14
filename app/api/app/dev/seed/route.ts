import { demoEnabled, removeDemo, seedDemo } from '@/lib/server/demo-seed';
import { ensureOwnerMember } from '@/lib/server/business';
import { currentUser } from '@clerk/nextjs/server';
import { HttpError, handler, json, requireBusiness } from '@/lib/server/api';

// Staging only: the flag must be on, and never on the production Vercel environment.
function guard() {
  if (!demoEnabled()) throw new HttpError(404, 'غير موجود');
}

export const POST = handler(async () => {
  guard();
  const { business } = await requireBusiness();
  const owner = await ensureOwnerMember(business, await currentUser());
  await seedDemo(business, owner.name);
  return json({ ok: true });
});

export const DELETE = handler(async () => {
  guard();
  const { business } = await requireBusiness();
  await removeDemo(business);
  return json({ ok: true });
});
