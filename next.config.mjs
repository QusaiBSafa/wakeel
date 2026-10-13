/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig = {
  poweredByHeader: false,
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
