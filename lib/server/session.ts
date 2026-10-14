import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { findBusiness } from './business';

/** For server pages: the signed-in user's id and business row (or null). */
export async function pageSession() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const business = await findBusiness(userId);
  return { userId, business };
}
