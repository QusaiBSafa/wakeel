import { DAYS } from './format';
import { faqSuggestionsFor } from './constants';

// Pure onboarding helpers: step list and "done" logic (port of the prototype's stepDone).

export type StepCtx = {
  maxStep: number;
  skipped: number[];
  waConnected: boolean;
  /** the business offers delivery (step 5 applies) */
  delivery: boolean;
  /** Hudhud has been activated (the wizard is finished) */
  activated: boolean;
};

export const STEP_COUNT = 8;

export function stepDone(i: number, c: StepCtx): boolean {
  if (c.activated) return true;
  if (c.skipped.includes(i)) return false;
  if (i === 7) return c.waConnected;
  if (i === 8) return false;
  return c.maxStep > i;
}

/** Number of finished steps out of 8 (step 5 counts once the user is past it when delivery is not offered). */
export function doneCount(c: StepCtx): number {
  let n = 0;
  for (let i = 1; i <= STEP_COUNT; i++) if (stepDone(i, c) || (i === 5 && !c.delivery && c.maxStep > 5)) n++;
  return n;
}

// ---------- generated FAQ rows for step 6 ----------
export type DayHours = { on: boolean; from: string; to: string };
export type FaqRow = { key: string; q: string; a: string; on: boolean };

/** "9 صباحاً" / "7:30 مساءً" from an HH:MM string. */
export function timePhrase(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 || 12;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'صباحاً' : 'مساءً'}`;
}

/** Arabic sentence for the opening hours, built from the seven day rows (Saturday first). */
export function hoursSentence(hours: DayHours[]): string {
  const open = hours.map((h, i) => ({ ...h, i })).filter((h) => h.on);
  if (!open.length) return 'نحن مغلقون حالياً.';
  const closed = hours.map((h, i) => ({ ...h, i })).filter((h) => !h.on);
  const same = open.every((h) => h.from === open[0].from && h.to === open[0].to);
  const contiguous = open.every((h, k) => k === 0 || h.i === open[k - 1].i + 1);
  const range = (a: string, b: string) => `من ${timePhrase(a)} حتى ${timePhrase(b)}`;
  let main: string;
  if (same) {
    const days = contiguous && open.length > 1 ? `من ${DAYS[open[0].i]} إلى ${DAYS[open[open.length - 1].i]}` : `أيام ${open.map((h) => DAYS[h.i]).join(' و')}`;
    main = `نستقبلكم ${days}، ${range(open[0].from, open[0].to)}.`;
  } else {
    main = `نستقبلكم ${open.map((h) => `${DAYS[h.i]} ${range(h.from, h.to)}`).join('، ')}.`;
  }
  if (!closed.length) return main;
  return `${main} ${closed.length === 1 ? `يوم ${DAYS[closed[0].i]} عطلة.` : `نغلق أيام ${closed.map((h) => DAYS[h.i]).join(' و')}.`}`;
}

/** Step 6 rows: opening hours, location, and the first two suggestions for the business type (empty, unchecked). */
export function generatedFaqs(type: string, d: { hours: DayHours[]; city: string; address: string }): FaqRow[] {
  const place = [d.city, d.address].map((x) => x.trim()).filter(Boolean).join('، ');
  const sugg = faqSuggestionsFor(type).slice(0, 2);
  return [
    { key: 'common.hours', q: 'ما هي أوقات العمل؟', a: hoursSentence(d.hours), on: true },
    { key: 'common.location', q: 'أين يقع مكانكم؟', a: place ? `في ${place}.` : '', on: !!place },
    ...sugg.map((x) => ({ key: x.key, q: x.q, a: '', on: false })),
  ];
}
