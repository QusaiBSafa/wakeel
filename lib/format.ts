import { fmt as clock12, dayStart, minutesOf, nowInTz, weekdayOf, ymd } from './time';

export const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
/** Saturday-first. Weekday index 0 = Saturday … 6 = Friday. */
export const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export const PHONE_RE = /^\+?[\d][\d\s\-()]{7,18}$/;
export const URL_RE = /^https?:\/\/\S+$/i;

/** "1,240 ₪"; decimals only when non-zero ("12.5 ₪"). */
export function formatMoney(minor: number): string {
  const v = (Number(minor) || 0) / 100;
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(v) + ' ₪';
}

/** "11:30 ص" */
export const clock = clock12;

function unit(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Duration as words: «4 دقائق»، «25 دقيقة»، «دقيقتين»، «ساعة»، «3 ساعات». */
export function waitText(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return unit(min, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.floor(min / 60);
  if (h < 24) return unit(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  const d = Math.floor(h / 24);
  return unit(d, 'يوم', 'يومين', 'أيام', 'يوماً');
}

/** «آخر تحديث» text: «الآن»، «قبل دقيقتين»، «قبل 3 أيام»، «قبل أسبوع»، «قبل شهر». */
export function agoText(date: Date | string | number, now: Date | number = Date.now()): string {
  const ms = new Date(now).getTime() - new Date(date).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return 'قبل ' + unit(min, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.floor(min / 60);
  if (h < 24) return 'قبل ' + unit(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  const d = Math.floor(h / 24);
  if (d < 7) return 'قبل ' + unit(d, 'يوم', 'يومين', 'أيام', 'يوماً');
  if (d < 30) {
    const w = Math.floor(d / 7);
    return 'قبل ' + unit(w, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوعاً');
  }
  const mo = Math.floor(d / 30);
  if (mo < 12) return 'قبل ' + unit(mo, 'شهر', 'شهرين', 'أشهر', 'شهراً');
  const y = Math.floor(mo / 12);
  return 'قبل ' + unit(y, 'سنة', 'سنتين', 'سنوات', 'سنة');
}

/** «اليوم 10:12 ص» / «أمس 6:20 م» / «12 تشرين الأول». */
export function relDay(date: Date | string | number, now: Date | number = Date.now()): string {
  const d = new Date(date);
  const t = nowInTz(d.getTime());
  const today = dayStart(now).getTime();
  const that = dayStart(d).getTime();
  const diffDays = Math.round((today - that) / 86400000);
  const time = clock12(minutesOf(d));
  if (diffDays === 0) return `اليوم ${time}`;
  if (diffDays === 1) return `أمس ${time}`;
  return `${t.getDate()} ${MONTHS[t.getMonth()]}`;
}

const DUR: Record<number, string> = { 30: '30 د', 45: '45 د', 60: 'ساعة', 90: 'ساعة ونصف', 120: 'ساعتان', 150: 'ساعتان ونصف', 240: '4 ساعات' };
export function durText(min: number): string {
  return DUR[min] || `${min} د`;
}

/** «الأربعاء 14 تشرين الأول» */
export function dateTitle(d: Date | string | number): string {
  const t = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? dayStart(d) : nowInTz(new Date(d).getTime());
  return `${DAYS[weekdayOf(typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date(d))]} ${t.getDate()} ${MONTHS[t.getMonth()]}`;
}

/** «14 تشرين الأول» */
export function dayMonth(d: Date | string | number): string {
  const t = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? dayStart(d) : nowInTz(new Date(d).getTime());
  return `${t.getDate()} ${MONTHS[t.getMonth()]}`;
}

/** «12 تشرين الأول 2026» */
export function fullDate(d: Date | string | number): string {
  const t = nowInTz(new Date(d).getTime());
  return `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`;
}

export function waLink(phone: string): string {
  return `https://wa.me/${String(phone).replace(/\D/g, '')}`;
}

export function telLink(phone: string): string {
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

export { ymd };
