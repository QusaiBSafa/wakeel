import { upload } from '@vercel/blob/client';

export type Uploaded = { url: string; pathname: string };

/** Upload a prepared WebP to products/{userId}/… or logos/{userId}/… via a short-lived token from /api/uploads. */
export async function uploadImage(kind: 'products' | 'logos', userId: string, blob: Blob): Promise<Uploaded> {
  const name = `${kind}/${userId}/${kind === 'logos' ? 'logo' : 'photo'}.webp`;
  const r = await upload(name, blob, {
    access: 'private',
    handleUploadUrl: '/api/uploads',
    contentType: 'image/webp',
  });
  return { url: r.url, pathname: r.pathname };
}
