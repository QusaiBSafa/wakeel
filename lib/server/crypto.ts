import 'server-only';
import crypto from 'node:crypto';

/**
 * AES-256-GCM for secrets we must store (provider API keys, webhook secrets).
 * `HUDHUD_ENC_KEY` is 32 random bytes, base64 (`openssl rand -base64 32`). Format: `v1.<iv>.<tag>.<data>` (base64url).
 */
function key(): Buffer {
  const raw = process.env.HUDHUD_ENC_KEY;
  if (!raw) throw new Error('HUDHUD_ENC_KEY is not set');
  const k = Buffer.from(raw, 'base64');
  if (k.length !== 32) throw new Error('HUDHUD_ENC_KEY must be 32 bytes (base64)');
  return k;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function decrypt(box: string): string {
  const [v, iv, tag, data] = box.split('.');
  if (v !== 'v1' || !iv || !tag || data === undefined) throw new Error('bad ciphertext');
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  d.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64url')), d.final()]).toString('utf8');
}

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

/** Keyed hash for ids we only need to compare or count (a customer's number), never to read back. */
export const hashId = (s: string) => crypto.createHmac('sha256', key()).update(s).digest('hex').slice(0, 32);

export const randomToken = () => crypto.randomBytes(32).toString('base64url');

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}
