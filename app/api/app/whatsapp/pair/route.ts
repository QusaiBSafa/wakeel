import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { cancelPairing, pairingState, startPairing, waProvider } from '@/lib/server/wa/pairing';
import { waPairSchema } from '@/lib/validation/account';

export const dynamic = 'force-dynamic';

function requireWasender() {
  if (waProvider() !== 'wasender') throw new HttpError(404, 'غير موجود');
}

/** Public base URL for the webhook. HUDHUD_PUBLIC_URL wins (needed when the deployment URL is protected). */
const origin = (req: Request) => (process.env.HUDHUD_PUBLIC_URL || new URL(req.url).origin).replace(/\/$/, '');

/** Starts linking a number: creates the session and returns the first QR. */
export const POST = handler(async (req: Request) => {
  requireWasender();
  const { business } = await requireBusiness();
  const { phone } = await parseBody(req, waPairSchema);
  return json(await startPairing(business, phone, origin(req)));
});

/** Polled while the QR is on screen: a fresh QR, or `connected` once scanned. */
export const GET = handler(async () => {
  requireWasender();
  const { business } = await requireBusiness();
  return json(await pairingState(business));
});

export const DELETE = handler(async () => {
  requireWasender();
  const { business } = await requireBusiness();
  await cancelPairing(business);
  return json({ status: 'none' });
});
