import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness } from '@/lib/server/api';
import { bookingSchema } from '@/lib/validation';
import { toMin } from '@/lib/slots';

const { bookingSettings, availability, openDays } = schema;

/** Replace the whole booking setup (settings + weekly ranges) in one transaction. */
export const PUT = handler(async (req: Request) => {
  const { business } = await requireBusiness();
  const input = await parseBody(req, bookingSchema);
  const businessId = business.id;
  await db().transaction(async (tx) => {
    await tx
      .insert(bookingSettings)
      .values({ businessId, enabled: input.enabled, slotMinutes: input.slotMinutes, bufferMinutes: input.bufferMinutes })
      .onConflictDoUpdate({
        target: bookingSettings.businessId,
        set: { enabled: input.enabled, slotMinutes: input.slotMinutes, bufferMinutes: input.bufferMinutes, updatedAt: new Date() },
      });
    await tx.delete(availability).where(eq(availability.businessId, businessId));
    const rows = input.days.flatMap((d, weekday) => d.ranges.map((r) => ({ businessId, weekday, startMin: toMin(r.s), endMin: toMin(r.e) })));
    if (rows.length) await tx.insert(availability).values(rows);
    await tx.delete(openDays).where(eq(openDays.businessId, businessId));
    await tx.insert(openDays).values(input.days.map((d, weekday) => ({ businessId, weekday, open: d.on })));
  });
  return json({ ok: true });
});
