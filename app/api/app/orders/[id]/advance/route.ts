import { assertUuid, handler, json, requireBusiness } from '@/lib/server/api';
import { advanceOrder } from '@/lib/server/orders';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  return json(await advanceOrder(business, id));
});
