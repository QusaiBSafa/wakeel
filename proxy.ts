import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Clerk runs only on the routes that need a session (see config.matcher). The landing page,
// /api/order, /admin (its own basic auth) and /media (photos shown to customers) never touch Clerk.
// /api/uploads is matched so auth() works there, but it is not protected here because Vercel Blob's
// upload-completed callback has no session; the route checks the user itself.
const isProtectedPage = createRouteMatcher(['/dashboard(.*)', '/onboarding(.*)']);
const isProtectedApi = createRouteMatcher(['/api/app(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedApi(req)) {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: 'لازم تسجّل دخول' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return;
  }
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/sign-in/:path*', '/sign-up/:path*', '/api/app/:path*', '/api/uploads'],
};
