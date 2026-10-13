// Pure time/slot helpers shared by the booking page preview, the readiness score and the server validators.

export type Range = { s: string; e: string };
export type Day = { on: boolean; ranges: Range[] };

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isHHMM(v: string): boolean {
  return HHMM.test(v);
}

export function toMin(t: string): number {
  const [h, m] = String(t || '').split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

export function hhmm(m: number): string {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}

/** 12-hour Arabic label, e.g. "4:30 م". 24:00 is shown as 12:00 ص. */
export function fmt(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return (h % 12 || 12) + ':' + String(mm).padStart(2, '0') + (h < 12 ? ' ص' : ' م');
}

/** Error message for range j (checked against earlier ranges), or '' when valid. */
export function rangeError(ranges: Range[], j: number): string {
  const r = ranges[j];
  if (!r || !r.s || !r.e || !isHHMM(r.s) || !isHHMM(r.e)) return 'حدد وقت البداية والنهاية';
  const a = toMin(r.s);
  const b = toMin(r.e);
  if (b <= a) return 'وقت النهاية لازم يكون بعد البداية';
  for (let k = 0; k < j; k++) {
    const o = ranges[k];
    if (a < toMin(o.e) && b > toMin(o.s)) return 'هالفترة متداخلة مع فترة ثانية';
  }
  return '';
}

export function rangesValid(ranges: Range[]): boolean {
  return ranges.every((_, j) => !rangeError(ranges, j));
}

/** Start minutes of every bookable slot for a day. Invalid ranges are skipped. */
export function slotStarts(day: Day, slotMinutes: number, bufferMinutes = 0): number[] {
  if (!day.on || !(slotMinutes >= 5 && slotMinutes <= 480)) return [];
  const buf = Math.max(0, Math.floor(bufferMinutes) || 0);
  const out: number[] = [];
  day.ranges.forEach((r, j) => {
    if (rangeError(day.ranges, j)) return;
    let t = toMin(r.s);
    const e = toMin(r.e);
    while (t + slotMinutes <= e) {
      out.push(t);
      t += slotMinutes + buf;
    }
  });
  return out;
}

export function weekSlotCount(days: Day[], slotMinutes: number, bufferMinutes = 0): number {
  return days.reduce((n, d) => n + slotStarts(d, slotMinutes, bufferMinutes).length, 0);
}

export function dayHours(day: Day): string {
  return day.on ? day.ranges.map((r) => fmt(toMin(r.s)) + ' – ' + fmt(toMin(r.e))).join('، ') : 'مغلق';
}
