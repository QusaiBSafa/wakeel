import { z } from 'zod';
import { handler, json, parseBody, requireUserId } from '@/lib/server/api';
import { saveStep } from '@/lib/server/onboarding';
import { stepBodySchema } from '@/lib/validation/onboarding';

type Ctx = { params: Promise<{ n: string }> };

export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { n } = await ctx.params;
  const body = await parseBody(req, stepBodySchema as z.ZodType<{ data: Record<string, unknown>; skipped?: boolean; draft?: boolean }>);
  const r = await saveStep(userId, Number(n), body);
  return json({ ok: true, ...r });
});
