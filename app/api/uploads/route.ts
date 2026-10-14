import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { MEDIA_MAX_BYTES, MEDIA_TYPES, mediaPrefix } from '@/lib/server/media';

/**
 * Issues short-lived client-upload tokens for product photos and logos.
 * Public in the proxy because Vercel Blob also POSTs the upload-completed callback here
 * (that call is verified by handleUpload's signature check, not by Clerk).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) throw new Error('unauthorized');
        const ok = pathname.startsWith(mediaPrefix('products', userId)) || pathname.startsWith(mediaPrefix('logos', userId));
        if (!ok || pathname.includes('..') || pathname.length > 200) throw new Error('forbidden path');
        return {
          allowedContentTypes: MEDIA_TYPES,
          maximumSizeInBytes: MEDIA_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId }),
        };
      },
      onUploadCompleted: async () => {
        // nothing to do: the product/logo save verifies the blob and records it
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upload failed';
    const status = msg === 'unauthorized' ? 401 : msg === 'forbidden path' ? 403 : 400;
    return NextResponse.json({ error: 'تعذّر رفع الصورة' }, { status });
  }
}
