import { TZDate } from '@date-fns/tz';

/** The business time zone is fixed this round. */
export const TZ = 'Asia/Hebron';

export function isHHMM(v: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
}

export function toMin(t: string): number {
  const [h, m] = String(t || '').split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

export function hhmm(m: number): string {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** 12-hour Arabic clock, e.g. "4:30 م". 24:00 is shown as 12:00 ص. */
export function fmt(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return (h % 12 || 12) + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' ص' : ' م');
}

export function nowInTz(now: Date | number = Date.now()): TZDate {
  return new TZDate(typeof now === 'number' ? now : now.getTime(), TZ);
}

/** YYYY-MM-DD of an instant in the business time zone. */
export function ymd(d: Date | number): string {
  const t = nowInTz(typeof d === 'number' ? d : d.getTime());
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Midnight (business time zone) of the day that contains `d`, or of the YYYY-MM-DD string. */
export function dayStart(d: Date | number | string): TZDate {
  if (typeof d === 'string') {
    const [y, m, day] = d.split('-').map(Number);
    return new TZDate(y, m - 1, day, 0, 0, 0, 0, TZ);
  }
  const t = nowInTz(typeof d === 'number' ? d : d.getTime());
  return new TZDate(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0, TZ);
}

/** Weekday index used everywhere in the product: 0 = Saturday … 6 = Friday. */
export function weekdayOf(d: Date | number | string): number {
  return (dayStart(d).getDay() + 1) % 7;
}

/** Instant at `min` minutes after midnight of the YYYY-MM-DD date (business time zone). */
export function atMinutes(dateStr: string, min: number): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(new TZDate(y, m - 1, d, Math.floor(min / 60), min % 60, 0, 0, TZ).getTime());
}

/** Minutes after midnight of an instant, business time zone. */
export function minutesOf(d: Date | number): number {
  const t = nowInTz(typeof d === 'number' ? d : d.getTime());
  return t.getHours() * 60 + t.getMinutes();
}

/** Add whole days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
