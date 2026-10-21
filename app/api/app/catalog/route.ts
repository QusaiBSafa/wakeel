import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { createItem } from '@/lib/server/catalog-write';
import { purgeDeleted } from '@/lib/server/catalog';
import { catalogCreateSchema } from '@/lib/validation/catalog';

export const POST = handler(async (req: Request) => {
  const { userId, business } = await requireBusiness();
  const body = await parseBody(req, catalogCreateSchema);
  await purgeDeleted(business.id);
  return json(await createItem(userId, business.id, body), 201);
});
