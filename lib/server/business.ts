import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { colorOf } from '@/lib/color';

const { businesses, teamMembers, aiSettings, bookingSettings, businessHours } = schema;

export type BusinessRow = typeof businesses.$inferSelect;
export type MemberRow = typeof teamMembers.$inferSelect;

export async function findBusiness(userId: string): Promise<BusinessRow | null> {
  const rows = await db().select().from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Photos are stored in a private Blob store and served via /media/<pathname>. */
export function mediaUrl(pathname: string | null | undefined): string | null {
  return pathname ? `/media/${pathname}` : null;
}

export type ClerkLike = { fullName?: string | null; firstName?: string | null; lastName?: string | null; primaryEmailAddress?: { emailAddress?: string } | null } | null;

export function clerkName(u: ClerkLike): string {
  return (u?.fullName || [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '').trim();
}

/**
 * The owner's team member row. Created when missing; the name and email follow Clerk when the stored
 * name is empty or still the business name (the data migration's placeholder), and the email when it differs.
 */
export async function ensureOwnerMember(business: BusinessRow, user: ClerkLike): Promise<MemberRow> {
  const d = db();
  const name = clerkName(user);
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const [existing] = await d.select().from(teamMembers).where(and(eq(teamMembers.businessId, business.id), eq(teamMembers.role, 'owner'))).limit(1);
  if (!existing) {
    const [row] = await d
      .insert(teamMembers)
      .values({ businessId: business.id, clerkUserId: business.ownerUserId, name: name || business.name || 'المالك', email, role: 'owner', status: 'active', color: colorOf(business.id), providesServices: false })
      .returning();
    return row;
  }
  const patch: Partial<typeof teamMembers.$inferInsert> = {};
  if (name && existing.name !== name && (!existing.name || existing.name === business.name)) patch.name = name;
  if (email && existing.email !== email) patch.email = email;
  if (!existing.clerkUserId) patch.clerkUserId = business.ownerUserId;
  if (!Object.keys(patch).length) return existing;
  const [row] = await d.update(teamMembers).set(patch).where(eq(teamMembers.id, existing.id)).returning();
  return row;
}

export async function getSettings(business: BusinessRow) {
  const d = db();
  const [row] = await d.select().from(bookingSettings).where(eq(bookingSettings.businessId, business.id)).limit(1);
  if (row) return row;
  const [created] = await d.insert(bookingSettings).values({ businessId: business.id }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await d.select().from(bookingSettings).where(eq(bookingSettings.businessId, business.id)).limit(1);
  return again;
}

/** First step of onboarding: the business row plus everything every business needs. */
export async function createBusiness(userId: string, init: Partial<typeof businesses.$inferInsert>, user: ClerkLike): Promise<BusinessRow> {
  const d = db();
  const [b] = await d
    .insert(businesses)
    .values({ ownerUserId: userId, ...init })
    .onConflictDoNothing({ target: businesses.ownerUserId })
    .returning();
  const business = b ?? (await findBusiness(userId))!;
  if (b) {
    await d.insert(aiSettings).values({ businessId: business.id }).onConflictDoNothing();
    await d.insert(bookingSettings).values({ businessId: business.id }).onConflictDoNothing();
    // Saturday–Thursday 09:00–19:00, Friday closed
    await d
      .insert(businessHours)
      .values(Array.from({ length: 7 }, (_, weekday) => ({ businessId: business.id, weekday, open: weekday !== 6, openMin: 540, closeMin: 1140 })))
      .onConflictDoNothing();
    await ensureOwnerMember(business, user);
  }
  return business;
}
