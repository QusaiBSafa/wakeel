import 'server-only';
import { cache } from 'react';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ensureOwnerMember, findBusiness } from './business';

/** For server pages: the signed-in user's id and business row (or null). Cached per request. */
export const pageSession = cache(async () => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const business = await findBusiness(userId);
  return { userId, business };
});

/** The owner's team member row (kept in step with Clerk), cached per request. */
export const pageOwner = cache(async () => {
  const { business } = await pageSession();
  if (!business) return null;
  return ensureOwnerMember(business, await currentUser());
});
