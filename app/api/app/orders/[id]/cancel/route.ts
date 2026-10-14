import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { cancelOrder } from '@/lib/server/orders';
import { cancelOrderSchema } from '@/lib/validation/orders';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const { reason } = await parseBody(req, cancelOrderSchema);
  return json(await cancelOrder(business, id, reason));
});
