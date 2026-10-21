// Client-side photo prep: validate, downscale to max 1600px and re-encode as WebP (~≤500 KB) before upload.

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_INPUT = 10 * 1024 * 1024;
const MAX_SIDE = 1600;
const TARGET = 500 * 1024;

export class ImageError extends Error {}

function looksSupported(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // some phones send HEIC with an empty type
  return !file.type && /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Safari can show HEIC in an <img> even when createImageBitmap refuses it
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

export type Prepared = { blob: Blob; width: number; height: number; originalBytes: number };

export async function prepareImage(file: File, maxSide = MAX_SIDE): Promise<Prepared> {
  if (!looksSupported(file) || file.size > MAX_INPUT) throw new ImageError('unsupported');
  let src: ImageBitmap | HTMLImageElement;
  try {
    src = await decode(file);
  } catch {
    throw new ImageError('unsupported');
  }
  const w0 = 'naturalWidth' in src ? src.naturalWidth : src.width;
  const h0 = 'naturalHeight' in src ? src.naturalHeight : src.height;
  const scale = Math.min(1, maxSide / Math.max(w0, h0));
  const width = Math.max(1, Math.round(w0 * scale));
  const height = Math.max(1, Math.round(h0 * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('unsupported');
  ctx.drawImage(src, 0, 0, width, height);
  if ('close' in src) src.close();
  let blob: Blob | null = null;
  for (const q of [0.82, 0.72, 0.6, 0.5]) {
    blob = await toBlob(canvas, q);
    if (blob && blob.size <= TARGET) break;
  }
  if (!blob || blob.type !== 'image/webp') throw new ImageError('unsupported');
  return { blob, width, height, originalBytes: file.size };
}

export function formatBytes(n: number) {
  return n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + ' ميغا' : Math.round(n / 1024) + ' كيلو';
}
