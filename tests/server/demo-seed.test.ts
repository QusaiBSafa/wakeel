import { afterAll, describe, expect, it } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { cleanup, HAS_DB, makeBusiness } from './helpers';

describe.skipIf(!HAS_DB)('demo seeder', () => {
  afterAll(cleanup);

  it('seeds every page, is idempotent, and removal leaves zero demo rows', async () => {
    const { db, schema: s } = await import('@/lib/db');
    const { seedDemo, removeDemo } = await import('@/lib/server/demo-seed');
    const b = await makeBusiness();
    await seedDemo(b, 'سامي');
    await seedDemo(b, 'سامي'); // twice: must not duplicate or hit unique constraints
    const count = async (t: typeof s.orders | typeof s.bookings | typeof s.attentionItems | typeof s.faqs | typeof s.catalogItems | typeof s.teamMembers | typeof s.deliveryAreas) =>
      (await db().select({ n: sql<number>`count(*)::int` }).from(t).where(eq(t.businessId, b.id)))[0].n;
    expect(await count(s.orders)).toBe(8);
    expect(await count(s.bookings)).toBe(19);
    expect(await count(s.attentionItems)).toBe(3);
    expect(await count(s.faqs)).toBe(8);
    expect(await count(s.catalogItems)).toBe(14);
    expect(await count(s.deliveryAreas)).toBe(6);
    const [wa] = await db().select().from(s.whatsappConnections).where(eq(s.whatsappConnections.businessId, b.id));
    expect(wa.isStub).toBe(true);

    await removeDemo(b);
    for (const t of [s.orders, s.bookings, s.attentionItems, s.faqs, s.catalogItems, s.deliveryAreas]) expect(await count(t)).toBe(0);
    expect(await count(s.teamMembers)).toBe(1); // only the owner remains
    const left = await db().select().from(s.whatsappConnections).where(and(eq(s.whatsappConnections.businessId, b.id)));
    expect(left).toHaveLength(0);
  });
});
