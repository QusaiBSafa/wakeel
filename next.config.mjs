/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

// Local testing only: the sandbox can't reach Clerk, so HUDHUD_E2E_AUTH=1 swaps in a cookie-based
// stand-in (tests/e2e/clerk-mock). Never enabled on Vercel.
const e2eAuth = process.env.HUDHUD_E2E_AUTH === '1' && !process.env.VERCEL;

const nextConfig = {
  ...(e2eAuth && {
    turbopack: {
      resolveAlias: {
        '@clerk/nextjs/server': './tests/e2e/clerk-mock/server.ts',
        '@clerk/nextjs': './tests/e2e/clerk-mock/client.tsx',
      },
    },
  }),
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // the dev-only floating badge sits over the drawer footer in RTL and breaks click-through in e2e runs
  devIndicators: false,
  async rewrites() {
    return {
      // the landing page stays a static file
      beforeFiles: [{ source: '/', destination: '/index.html' }],
      afterFiles: [
        { source: '/admin', destination: '/api/admin' },
        { source: '/admin/', destination: '/api/admin' },
      ],
    };
  },
  async redirects() {
    return [
      { source: '/dashboard/products', destination: '/dashboard/catalog', permanent: false },
      { source: '/dashboard/booking', destination: '/dashboard/bookings', permanent: false },
      { source: '/dashboard/info', destination: '/dashboard/business', permanent: false },
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  images: {
    // product photos and logos are served from our own /media route (private Blob store)
    localPatterns: [{ pathname: '/media/**' }],
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
    deviceSizes: [640, 828, 1080],
    imageSizes: [96, 128, 256],
    formats: ['image/webp'],
  },
};

export default nextConfig;
