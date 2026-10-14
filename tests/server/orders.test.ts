import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { cleanup, HAS_DB, makeBusiness } from './helpers';
import type { BusinessRow } from '@/lib/server/business';

describe.skipIf(!HAS_DB)('orders (local Postgres)', () => {
  let b: BusinessRow;
  let shampoo: string;
  let oil: string;
  let area: string;

  beforeAll(async () => {
    const { db, schema } = await import('@/lib/db');
    b = await makeBusiness();
    await db().update(schema.businesses).set({ freeOverMinor: 20000 }).where(eq(schema.businesses.id, b.id));
    b = { ...b, freeOverMinor: 20000 };
    const [p1] = await db().insert(schema.catalogItems).values({ businessId: b.id, kind: 'product', name: 'شامبو أرغان', priceMinor: 4500, variants: [{ name: '500 مل', priceMinor: 8000 }] }).returning();
    const [p2] = await db().insert(schema.catalogItems).values({ businessId: b.id, kind: 'product', name: 'زيت', priceMinor: 6000 }).returning();
    shampoo = p1.id;
    oil = p2.id;
    const [a] = await db().insert(schema.deliveryAreas).values({ businessId: b.id, name: 'رام الله', feeMinor: 1500, eta: 'يوم عمل واحد' }).returning();
    area = a.id;
  });
  afterAll(cleanup);

  const body = (lines: { itemId: string; variant?: string; qty: number }[], over = {}) => ({ customer: 'أحمد', phone: '+970 56 412 9930', lines, pickup: false, areaId: area, address: 'البيرة', notes: '', ...over });

  it('creates with server-side totals, increments the number and records the event', async () => {
    const { createOrder } = await import('@/lib/server/orders');
    const o1 = await createOrder(b, body([{ itemId: shampoo, qty: 2 }, { itemId: oil, qty: 1 }]));
    expect(o1).toMatchObject({ number: 1001, status: 'new', source: 'owner', subtotalMinor: 15000, deliveryFeeMinor: 1500, totalMinor: 16500 });
    expect(o1.items.map((i) => i.name)).toEqual(['شامبو أرغان', 'زيت']);
    expect(o1.events[0]).toMatchObject({ kind: 'owner', text: 'سامي ناصر أضاف الطلب' });
    const o2 = await createOrder(b, body([{ itemId: shampoo, variant: '500 مل', qty: 3 }]));
    expect(o2.number).toBe(1002);
    expect(o2.items[0]).toMatchObject({ name: 'شامبو أرغان · 500 مل', unitPriceMinor: 8000 });
    // 240 ≥ 200: delivery is free
    expect(o2).toMatchObject({ subtotalMinor: 24000, deliveryFeeMinor: 0, totalMinor: 24000 });
    const pickup = await createOrder(b, body([{ itemId: oil, qty: 1 }], { pickup: true, areaId: null, address: '' }));
    expect(pickup).toMatchObject({ pickup: true, deliveryFeeMinor: 0, totalMinor: 6000, areaName: '' });
  });

  it('rejects a product or area of another business and a bad variant', async () => {
    const { createOrder } = await import('@/lib/server/orders');
    const other = await makeBusiness();
    await expect(createOrder(other, body([{ itemId: shampoo, qty: 1 }]))).rejects.toMatchObject({ status: 404 });
    await expect(createOrder(b, body([{ itemId: shampoo, variant: 'ضخم', qty: 1 }]))).rejects.toMatchObject({ status: 400 });
  });

  it('edit recomputes totals; advance walks the flow; cancel needs a non-final order', async () => {
    const { createOrder, editOrder, advanceOrder, cancelOrder } = await import('@/lib/server/orders');
    const o = await createOrder(b, body([{ itemId: oil, qty: 1 }]));
    const e = await editOrder(b, o.id, body([{ itemId: oil, qty: 2 }]));
    expect(e).toMatchObject({ subtotalMinor: 12000, deliveryFeeMinor: 1500, totalMinor: 13500 });
    expect(e.events.at(-1)?.text).toBe('سامي ناصر عدّل الطلب');
    let cur = e;
    for (const s of ['confirmed', 'preparing', 'out', 'delivered']) {
      cur = await advanceOrder(b, cur.id);
      expect(cur.status).toBe(s);
    }
    expect(cur.deliveredAt).not.toBeNull();
    expect(cur.events.at(-1)?.kind).toBe('done');
    await expect(advanceOrder(b, cur.id)).rejects.toMatchObject({ status: 409 });
    await expect(editOrder(b, cur.id, body([{ itemId: oil, qty: 1 }]))).rejects.toMatchObject({ status: 409 });
    await expect(cancelOrder(b, cur.id, 'stock')).rejects.toMatchObject({ status: 409 });
    const fresh = await createOrder(b, body([{ itemId: oil, qty: 1 }]));
    const c = await cancelOrder(b, fresh.id, 'area');
    expect(c).toMatchObject({ status: 'cancelled', cancelReason: 'area' });
    expect(c.events.at(-1)?.text).toBe('أُلغي الطلب: لا نوصّل إلى هذه المنطقة.');
  });
});
