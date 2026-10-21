import { assertUuid, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { setBookingStatus } from '@/lib/server/bookings';
import { bookingStatusSchema } from '@/lib/validation/bookings';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handler(async (req: Request, ctx: Ctx) => {
  const { business } = await requireBusiness();
  const { id } = await ctx.params;
  assertUuid(id);
  const { to } = await parseBody(req, bookingStatusSchema);
  return json(await setBookingStatus(business, id, to));
});
