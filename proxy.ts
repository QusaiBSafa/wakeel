import { clerkMiddleware } from '@clerk/nextjs/server';

// Clerk only runs on routes that use a session (see matcher). Protection itself happens where the
// data is read: dashboard/onboarding pages redirect signed-out users, and every /api/app handler
// rejects requests without a user (lib/server/api.ts). The landing page, /api/order, /admin (its own
// basic auth) and /media never touch Clerk.
export default clerkMiddleware();

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/sign-in/:path*', '/sign-up/:path*', '/api/app/:path*', '/api/uploads'],
};
