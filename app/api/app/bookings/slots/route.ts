import { HttpError, handler, json, requireBusiness } from '@/lib/server/api';
import { slotsFor_ } from '@/lib/server/bookings';
import { slotsQuerySchema } from '@/lib/validation/bookings';
import { firstError } from '@/lib/validation/common';

export const GET = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const u = new URL(req.url);
  const r = slotsQuerySchema.safeParse({ itemId: u.searchParams.get('itemId'), date: u.searchParams.get('date'), excludeId: u.searchParams.get('excludeId') ?? undefined });
  if (!r.success) throw new HttpError(400, firstError(r.error));
  return json(await slotsFor_(business, r.data.itemId, r.data.date, r.data.excludeId));
});
