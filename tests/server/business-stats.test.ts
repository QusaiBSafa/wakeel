import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { cleanup, HAS_DB, makeBusiness } from './helpers';

describe.skipIf(!HAS_DB)('owner member and daily stats', () => {
  afterAll(cleanup);

  it('ensureOwnerMember refreshes the placeholder name and email from Clerk but keeps a custom name', async () => {
    const { db, schema } = await import('@/lib/db');
    const { ensureOwnerMember } = await import('@/lib/server/business');
    const b = await makeBusiness({ name: 'متجر' });
    // the data migration seeds the owner with the business name
    await db().update(schema.teamMembers).set({ name: 'متجر', email: '' }).where(eq(schema.teamMembers.businessId, b.id));
    let m = await ensureOwnerMember(b, { fullName: 'ليلى حسن', primaryEmailAddress: { emailAddress: 'l@example.com' } });
    expect(m).toMatchObject({ name: 'ليلى حسن', email: 'l@example.com', role: 'owner', providesServices: false });
    m = await ensureOwnerMember(b, { fullName: 'اسم آخر', primaryEmailAddress: { emailAddress: 'l@example.com' } });
    expect(m.name).toBe('ليلى حسن');
    const rows = await db().select().from(schema.teamMembers).where(eq(schema.teamMembers.businessId, b.id));
    expect(rows).toHaveLength(1);
  });

  it('bumpStat upserts into today and monthSum adds the month', async () => {
    const { bumpStat, monthSum } = await import('@/lib/server/stats');
    const b = await makeBusiness();
    await bumpStat(b.id, 'conversations');
    await bumpStat(b.id, 'conversations', 4);
    await bumpStat(b.id, 'resolved');
    expect(await monthSum(b.id, 'conversations')).toBe(5);
    expect(await monthSum(b.id, 'resolved')).toBe(1);
    expect(await monthSum(b.id, 'messages')).toBe(0);
  });
});
