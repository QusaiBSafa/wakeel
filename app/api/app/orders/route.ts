import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { createOrder } from '@/lib/server/orders';
import { orderBodySchema } from '@/lib/validation/orders';

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const body = await parseBody(req, orderBodySchema);
  return json(await createOrder(business, body), 201);
});
