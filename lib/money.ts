import { CURRENCIES, type Currency } from './constants';

/** Parse a user-typed price ("70", "12.5", "12,50", "٧٠") into minor units (cents), or null if invalid. */
export function parsePriceToMinor(input: string): number | null {
  const s = String(input ?? '')
    .trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace('٫', '.')
    .replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  return minor > 0 ? minor : null;
}

export function minorToInput(minor: number): string {
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return frac ? `${whole}.${String(frac).padStart(2, '0').replace(/0$/, '')}` : String(whole);
}

export function priceLabel(minor: number, currency: Currency | string): string {
  const sym = CURRENCIES.find((c) => c.k === currency)?.symbol ?? '';
  return `${minorToInput(minor)} ${sym}`.trim();
}
