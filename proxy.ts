import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Everything under /dashboard, /onboarding and the dashboard API needs a signed-in user.
// Public: the landing page, /api/order, /admin (its own basic auth), sign-in/up, /media (photos
// shown to customers) and /api/uploads (checks the user itself; Blob's callback has no session).
const isProtected = createRouteMatcher(['/dashboard(.*)', '/onboarding(.*)', '/api/app(.*)']);
const isProtectedApi = createRouteMatcher(['/api/app(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isProtected(req)) return;
  if (isProtectedApi(req)) {
    const { userId } = await auth();
    if (!userId) return Response.json({ error: 'لازم تسجّل دخول' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    return;
  }
  await auth.protect();
});

export const config = {
  matcher: [
    // skip Next internals and static files (the landing page is public/index.html)
    '/((?!_next|index\\.html|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
