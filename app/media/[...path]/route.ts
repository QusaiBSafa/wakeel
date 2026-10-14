import { get } from '@vercel/blob';

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Serves product photos and logos from the private Blob store. Only the products/ and logos/
 * prefixes are readable here: order requests (orders/) stay private.
 * Paths carry a random suffix and never change, so they are cached for a long time.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const pathname = path.map((p) => decodeURIComponent(p)).join('/');
  if (!/^(products|logos)\/user_[A-Za-z0-9]+\/[\w.\-]+\.(webp|jpe?g|png)$/.test(pathname)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const r = await get(pathname, { access: 'private' });
    if (!r || !r.stream) return new Response('Not found', { status: 404 });
    return new Response(r.stream, {
      headers: {
        'Content-Type': r.blob.contentType || 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'",
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
