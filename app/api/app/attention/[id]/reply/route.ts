import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { HttpError, assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { stubSend } from '@/lib/server/send';
import { attentionReplySchema } from '@/lib/validation/attention';

type Ctx = { params: Promise<{ id: string }> };

/** STUB send: records only that a reply happened and whether Hudhud stays paused. The text is never stored or logged. */
export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const { mode, resume } = await parseBody(req, attentionReplySchema);
  const [row] = await db()
    .update(schema.attentionItems)
    .set({ status: 'replied', hodhodPaused: !resume })
    .where(and(eq(schema.attentionItems.id, id), eq(schema.attentionItems.businessId, business.id)))
    .returning({ id: schema.attentionItems.id });
  if (!row) throw new HttpError(404, 'غير موجود');
  stubSend(mode === 'write' ? 'attention-reply' : 'attention-instruction', business.id);
  return json({ id, status: 'replied', hodhodPaused: !resume });
});
