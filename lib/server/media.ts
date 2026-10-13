import 'server-only';
import { del, head } from '@vercel/blob';
import { HttpError } from './api';

export type MediaKind = 'products' | 'logos';

export const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
export const MEDIA_TYPES = ['image/webp', 'image/jpeg', 'image/png'];

/** Upload prefix a user may write to. */
export function mediaPrefix(kind: MediaKind, userId: string) {
  return `${kind}/${userId}/`;
}

/**
 * Confirm an uploaded blob belongs to this user before we store it: the pathname must be under
 * the user's prefix, the URL must point at that pathname on a Vercel Blob host, and the blob must exist.
 */
export async function verifyOwnedBlob(kind: MediaKind, userId: string, image: { url: string; pathname: string }) {
  const prefix = mediaPrefix(kind, userId);
  if (!image.pathname.startsWith(prefix) || image.pathname.includes('..')) throw new HttpError(403, 'الصورة مش إلك');
  let u: URL;
  try {
    u = new URL(image.url);
  } catch {
    throw new HttpError(400, 'رابط الصورة مش صحيح');
  }
  if (u.protocol !== 'https:' || !/\.blob\.vercel-storage\.com$/.test(u.hostname) || decodeURIComponent(u.pathname) !== '/' + image.pathname) {
    throw new HttpError(403, 'الصورة مش إلك');
  }
  try {
    const meta = await head(image.url);
    if (!MEDIA_TYPES.includes(meta.contentType) || meta.size > MEDIA_MAX_BYTES) throw new HttpError(400, 'الصورة مش مدعومة');
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, 'الصورة ما انرفعت، جرّب كمان مرة');
  }
}

export async function deleteBlob(url: string | null | undefined) {
  if (!url) return;
  try {
    await del(url);
  } catch (e) {
    // not fatal: an orphaned photo is better than a failed save
    console.error('blob delete failed', e);
  }
}
