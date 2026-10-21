import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { editOrder } from '@/lib/server/orders';
import { orderBodySchema } from '@/lib/validation/orders';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const body = await parseBody(req, orderBodySchema);
  return json(await editOrder(business, id, body));
});
