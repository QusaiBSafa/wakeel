import { describe, expect, it } from 'vitest';
import { calcTotals } from '../lib/orders';

const L = (p: number, q: number) => ({ unitPriceMinor: p, qty: q });

describe('calcTotals', () => {
  it('adds the area fee below the free-delivery threshold', () => {
    expect(calcTotals([L(4500, 2)], { feeMinor: 1500 }, false, 20000)).toEqual({ subtotal: 9000, fee: 1500, total: 10500, free: false });
  });
  it('waives the fee when the subtotal reaches the threshold', () => {
    expect(calcTotals([L(10000, 2)], { feeMinor: 1500 }, false, 20000)).toEqual({ subtotal: 20000, fee: 0, total: 20000, free: true });
  });
  it('has no fee for pickup', () => {
    expect(calcTotals([L(4500, 1)], { feeMinor: 1500 }, true, 20000)).toEqual({ subtotal: 4500, fee: 0, total: 4500, free: false });
  });
  it('treats a free area as not "free delivery"', () => {
    expect(calcTotals([L(25000, 1)], { feeMinor: 0 }, false, 20000).free).toBe(false);
  });
  it('never waives without a threshold', () => {
    expect(calcTotals([L(99999, 1)], { feeMinor: 1500 }, false, null).fee).toBe(1500);
  });
});
