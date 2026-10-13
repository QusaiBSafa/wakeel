// Local-only stand-in for @clerk/nextjs/server (the sandbox can't reach Clerk). Enabled by
// HUDHUD_E2E_AUTH=1 in next.config.mjs, never on Vercel. The "user" is the e2e_user cookie.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

if (process.env.VERCEL) throw new Error('clerk mock must never run on Vercel');

export async function auth() {
  const userId = (await cookies()).get('e2e_user')?.value || null;
  return { userId };
}
auth.protect = async () => {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return { userId };
};

export function clerkMiddleware() {
  return () => NextResponse.next();
}
