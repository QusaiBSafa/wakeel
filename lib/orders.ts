// Pure order maths. The server always recomputes totals with this; the client total is display-only.

export type AreaFee = { feeMinor: number } | null;

export function calcTotals(lines: { unitPriceMinor: number; qty: number }[], area: AreaFee, pickup: boolean, freeOverMinor: number | null) {
  const subtotal = lines.reduce((n, l) => n + l.unitPriceMinor * l.qty, 0);
  const areaFee = pickup || !area ? 0 : area.feeMinor;
  const free = areaFee > 0 && freeOverMinor !== null && freeOverMinor > 0 && subtotal >= freeOverMinor;
  const fee = free ? 0 : areaFee;
  return { subtotal, fee, total: subtotal + fee, free };
}
