import { HttpError, handler, json, parseBody } from '@/lib/server/api';
import { applyIngest, ingestAuthorized } from '@/lib/server/ingest';
import { ingestSchema } from '@/lib/validation/ingest';

export const dynamic = 'force-dynamic';

/**
 * Entry point for the future WhatsApp bot (see docs/ingest.md). Not under /api/app and not behind Clerk:
 * `Authorization: Bearer $HUDHUD_INGEST_SECRET`. The route does not exist (404) while the secret is unset.
 */
export const POST = handler(async (req: Request) => {
  const secret = process.env.HUDHUD_INGEST_SECRET;
  if (!secret) return json({ error: 'غير موجود' }, 404);
  if (!ingestAuthorized(req.headers.get('authorization'), secret)) throw new HttpError(401, 'غير مصرّح');
  const msg = await parseBody(req, ingestSchema);
  return json(await applyIngest(msg));
});
