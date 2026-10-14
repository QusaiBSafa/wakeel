import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { bookingById, rescheduleBooking } from '@/lib/server/bookings';
import { bookingRescheduleSchema } from '@/lib/validation/bookings';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  return json(await bookingById(business.id, id));
});

export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const body = await parseBody(req, bookingRescheduleSchema);
  return json(await rescheduleBooking(business, id, body));
});
