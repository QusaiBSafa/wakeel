import { describe, expect, it } from 'vitest';
import { agoText, clock, dateTitle, durText, formatMoney, PHONE_RE, relDay, telLink, URL_RE, waitText, waLink } from '../lib/format';
import { atMinutes, weekdayOf, ymd, addDays, minutesOf } from '../lib/time';

describe('formatMoney', () => {
  it('groups thousands and hides zero decimals', () => {
    expect(formatMoney(124000)).toBe('1,240 ₪');
    expect(formatMoney(1250)).toBe('12.5 ₪');
    expect(formatMoney(0)).toBe('0 ₪');
    expect(formatMoney(1205)).toBe('12.05 ₪');
  });
});

describe('waitText', () => {
  it('agrees in number', () => {
    expect(waitText(60_000)).toBe('دقيقة');
    expect(waitText(2 * 60_000)).toBe('دقيقتين');
    expect(waitText(4 * 60_000)).toBe('4 دقائق');
    expect(waitText(10 * 60_000)).toBe('10 دقائق');
    expect(waitText(11 * 60_000)).toBe('11 دقيقة');
    expect(waitText(25 * 60_000)).toBe('25 دقيقة');
    expect(waitText(60 * 60_000)).toBe('ساعة');
    expect(waitText(2 * 3600_000)).toBe('ساعتين');
    expect(waitText(3 * 3600_000)).toBe('3 ساعات');
    expect(waitText(12 * 3600_000)).toBe('12 ساعة');
  });
});

describe('agoText', () => {
  const now = new Date('2026-10-14T10:00:00Z');
  const ago = (ms: number) => agoText(new Date(now.getTime() - ms), now);
  it('covers the ranges', () => {
    expect(ago(10_000)).toBe('الآن');
    expect(ago(2 * 60_000)).toBe('قبل دقيقتين');
    expect(ago(3 * 86400_000)).toBe('قبل 3 أيام');
    expect(ago(7 * 86400_000)).toBe('قبل أسبوع');
    expect(ago(14 * 86400_000)).toBe('قبل أسبوعين');
    expect(ago(31 * 86400_000)).toBe('قبل شهر');
  });
});

describe('durText', () => {
  it('uses the prototype map', () => {
    expect(durText(30)).toBe('30 د');
    expect(durText(60)).toBe('ساعة');
    expect(durText(90)).toBe('ساعة ونصف');
    expect(durText(120)).toBe('ساعتان');
    expect(durText(150)).toBe('ساعتان ونصف');
    expect(durText(240)).toBe('4 ساعات');
    expect(durText(25)).toBe('25 د');
  });
});

describe('dates', () => {
  it('weekday is Saturday-first', () => {
    expect(weekdayOf('2026-10-17')).toBe(0); // Saturday
    expect(weekdayOf('2026-10-14')).toBe(4); // Wednesday
    expect(weekdayOf('2026-10-16')).toBe(6); // Friday
  });
  it('dateTitle', () => {
    expect(dateTitle('2026-10-14')).toBe('الأربعاء 14 تشرين الأول');
  });
  it('atMinutes and minutesOf round-trip in the business zone', () => {
    const d = atMinutes('2026-10-14', 13 * 60 + 30);
    expect(ymd(d)).toBe('2026-10-14');
    expect(minutesOf(d)).toBe(810);
  });
  it('addDays crosses month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('relDay', () => {
    const now = atMinutes('2026-10-14', 12 * 60);
    expect(relDay(atMinutes('2026-10-14', 10 * 60 + 12), now)).toBe('اليوم 10:12 ص');
    expect(relDay(atMinutes('2026-10-13', 18 * 60 + 20), now)).toBe('أمس 6:20 م');
    expect(relDay(atMinutes('2026-10-12', 9 * 60), now)).toBe('12 تشرين الأول');
  });
  it('clock', () => {
    expect(clock(690)).toBe('11:30 ص');
    expect(clock(0)).toBe('12:00 ص');
    expect(clock(13 * 60)).toBe('1:00 م');
  });
});

describe('links and patterns', () => {
  it('builds wa.me and tel links', () => {
    expect(waLink('+970 59 123 4567')).toBe('https://wa.me/970591234567');
    expect(telLink('+970 59 123 4567')).toBe('tel:+970591234567');
  });
  it('validates phones and urls', () => {
    expect(PHONE_RE.test('+970 59 123 4567')).toBe(true);
    expect(PHONE_RE.test('12')).toBe(false);
    expect(URL_RE.test('https://maps.app.goo.gl/x')).toBe(true);
    expect(URL_RE.test('maps.google.com')).toBe(false);
  });
});

import { doneCount, generatedFaqs, hoursSentence, stepDone } from '../lib/onboarding';

describe('onboarding helpers', () => {
  const day = (on: boolean, from = '09:00', to = '19:00') => ({ on, from, to });
  it('hours sentence matches the prototype wording', () => {
    const w = [day(true), day(true), day(true), day(true), day(true), day(true), day(false)];
    expect(hoursSentence(w)).toBe('نستقبلكم من السبت إلى الخميس، من 9 صباحاً حتى 7 مساءً. يوم الجمعة عطلة.');
  });
  it('non-contiguous days and mixed hours', () => {
    expect(hoursSentence([day(true), day(false), day(true), day(false), day(false), day(false), day(false)])).toBe('نستقبلكم أيام السبت والاثنين، من 9 صباحاً حتى 7 مساءً. نغلق أيام الأحد والثلاثاء والأربعاء والخميس والجمعة.');
    expect(hoursSentence([day(true, '08:30', '16:00'), day(true), ...Array(5).fill(day(false))])).toContain('السبت من 8:30 صباحاً حتى 4 مساءً، الأحد من 9 صباحاً حتى 7 مساءً');
  });
  it('generated FAQs: hours and location on, two suggestions off and empty', () => {
    const rows = generatedFaqs('salon', { hours: Array(7).fill(day(true)), city: 'نابلس', address: 'شارع رفيديا' });
    expect(rows.map((r) => [r.key, r.on])).toEqual([['common.hours', true], ['common.location', true], ['salon.0', false], ['salon.1', false]]);
    expect(rows[1].a).toBe('في نابلس، شارع رفيديا.');
    expect(rows[2].a).toBe('');
  });
  it('step done logic', () => {
    const c = { maxStep: 4, skipped: [3], waConnected: false, delivery: false, activated: false };
    expect(stepDone(1, c)).toBe(true);
    expect(stepDone(3, c)).toBe(false); // skipped
    expect(stepDone(4, c)).toBe(false);
    expect(doneCount(c)).toBe(2);
    expect(doneCount({ ...c, maxStep: 6 })).toBe(4); // 1, 2, 4 and 5 (not applicable but passed); 3 was skipped
    expect(doneCount({ ...c, activated: true })).toBe(8);
  });
});
