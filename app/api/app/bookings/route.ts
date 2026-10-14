import { HttpError, handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { bookingsInRange, createBooking } from '@/lib/server/bookings';
import { addDays } from '@/lib/time';
import { bookingCreateSchema, rangeQuerySchema } from '@/lib/validation/bookings';
import { firstError } from '@/lib/validation/common';

export const GET = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const u = new URL(req.url);
  const r = rangeQuerySchema.safeParse({ from: u.searchParams.get('from'), to: u.searchParams.get('to') });
  if (!r.success) throw new HttpError(400, firstError(r.error));
  const { from, to } = r.data;
  if (to < from || addDays(from, 31) < to) throw new HttpError(400, 'البيانات غير صحيحة');
  return json({ bookings: await bookingsInRange(business.id, from, to) });
});

export const POST = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const body = await parseBody(req, bookingCreateSchema);
  return json(await createBooking(business, body), 201);
});
