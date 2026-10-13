import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { handler, json, parseBody, requireBusiness, requireUserId } from '@/lib/server/api';
import { businessDTO, findBusiness, loadState, syncFaqTemplates } from '@/lib/server/state';
import { createBusinessSchema, updateBusinessSchema } from '@/lib/validation';
import { verifyOwnedBlob, deleteBlob } from '@/lib/server/media';
import { parsePriceToMinor } from '@/lib/money';

const { businesses, bookingSettings } = schema;

/** Create the signed-in user's business (onboarding step 1). Idempotent: a second call updates it. */
export const POST = handler(async (req: Request) => {
  const userId = await requireUserId();
  const input = await parseBody(req, createBusinessSchema);
  const existing = await findBusiness(userId);
  let row;
  if (existing) {
    [row] = await db()
      .update(businesses)
      .set({ name: input.name, category: input.category, phone: input.phone, onboardingStep: Math.max(existing.onboardingStep, 1), updatedAt: new Date() })
      .where(eq(businesses.id, existing.id))
      .returning();
  } else {
    [row] = await db()
      .insert(businesses)
      .values({ ownerUserId: userId, name: input.name, category: input.category, phone: input.phone, onboardingStep: 1 })
      .onConflictDoUpdate({ target: businesses.ownerUserId, set: { name: input.name, category: input.category, phone: input.phone } })
      .returning();
    await db().insert(bookingSettings).values({ businessId: row.id }).onConflictDoNothing();
  }
  await syncFaqTemplates(row.id, row.category);
  return json(await loadState(row), existing ? 200 : 201);
});

export const PATCH = handler(async (req: Request) => {
  const { userId, business } = await requireBusiness();
  const input = await parseBody(req, updateBusinessSchema);
  const set: Partial<typeof businesses.$inferInsert> = { updatedAt: new Date() };

  if (input.name !== undefined) set.name = input.name;
  if (input.category !== undefined) set.category = input.category;
  if (input.description !== undefined) set.description = input.description;
  if (input.address !== undefined) set.address = input.address;
  if (input.mapUrl !== undefined) set.mapUrl = input.mapUrl;
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.hoursMode !== undefined) set.hoursMode = input.hoursMode;
  if (input.hoursText !== undefined) set.hoursText = input.hoursText;
  if (input.paymentMethods !== undefined) set.paymentMethods = Array.from(new Set(input.paymentMethods));
  if (input.socials !== undefined) set.socials = { ...business.socials, ...input.socials };
  if (input.delivery !== undefined) {
    const prev = business.delivery || { enabled: false };
    const { fee, ...rest } = input.delivery;
    set.delivery = { ...prev, ...rest };
    if (fee !== undefined) set.delivery.feeMinor = fee === '' || fee === '0' ? (fee === '0' ? 0 : null) : parsePriceToMinor(fee);
  }
  if (input.onboardingStep !== undefined) set.onboardingStep = Math.max(business.onboardingStep, input.onboardingStep);
  if (input.onboarded) set.onboardedAt = business.onboardedAt ?? new Date();

  let oldLogo: string | null = null;
  if (input.logo !== undefined) {
    if (input.logo) await verifyOwnedBlob('logos', userId, input.logo);
    oldLogo = business.logoUrl;
    set.logoUrl = input.logo?.url ?? null;
    set.logoPathname = input.logo?.pathname ?? null;
  }

  const [row] = await db().update(businesses).set(set).where(eq(businesses.id, business.id)).returning();
  if (oldLogo && oldLogo !== row.logoUrl) await deleteBlob(oldLogo);
  if (input.category !== undefined && input.category !== business.category) {
    await syncFaqTemplates(row.id, row.category);
    return json({ business: businessDTO(row), state: await loadState(row) });
  }
  return json({ business: businessDTO(row) });
});
