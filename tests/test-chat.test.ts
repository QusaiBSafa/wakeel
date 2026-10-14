import { describe, expect, it } from 'vitest';
import { aiReply, englishHours, onboardingAnswer, type AiChatCtx } from '../lib/client/test-chat';
import { AI_DEFAULTS } from '../lib/constants';

const day = (on: boolean) => ({ on, from: '09:00', to: '19:00' });
const hours = [day(true), day(true), day(true), day(true), day(true), day(true), day(false)];
const base: AiChatCtx = { cfg: AI_DEFAULTS, on: true, business: { name: 'لمسة', phone: '+970 59 812 3344' }, hours, item: { name: 'صبغة شعر', priceMinor: 18000 } };
const ai = (t: string, over: Partial<AiChatCtx> = {}, cfg: Partial<typeof AI_DEFAULTS> = {}) => aiReply(t, { ...base, ...over, cfg: { ...AI_DEFAULTS, ...cfg } });

describe('test chat (client-only, deterministic)', () => {
  it('answers hours from the real hours', () => {
    expect(ai('متى تفتحون؟')[0].text).toContain('من السبت إلى الخميس، من 9 صباحاً حتى 7 مساءً. يوم الجمعة عطلة.');
  });
  it('answers prices from the catalog and hands off when unknown or not allowed', () => {
    expect(ai('كم سعر الصبغة؟')[0].text).toContain('سعر صبغة شعر 180 ₪');
    expect(ai('كم السعر؟', { item: null }).at(-1)?.k).toBe('sys');
    expect(ai('كم السعر؟', {}, { perms: { ...AI_DEFAULTS.perms, prices: false } })[0].text).toContain('سيرسل لك فريقنا الأسعار');
  });
  it('discount handoff follows the rule', () => {
    expect(ai('في خصم؟').at(-1)?.text).toContain('طلب خصم');
    expect(ai('في خصم؟', {}, { rules: { ...AI_DEFAULTS.rules, discount: false } })[0].text).toContain('لا توجد خصومات');
  });
  it('booking respects the permission and approve mode', () => {
    expect(ai('أريد حجز موعد').length).toBe(1);
    expect(ai('أريد حجز موعد', {}, { mode: 'approve' }).at(-1)?.text).toContain('بانتظار موافقتك');
    expect(ai('أريد حجز موعد', {}, { perms: { ...AI_DEFAULTS.perms, bookings: false } }).at(-1)?.k).toBe('sys');
  });
  it('unknown-answer behaviours use the real phone and custom text', () => {
    expect(ai('هل الطقس جميل اليوم؟', {}, { unk: 'call' })[0].text).toContain('+970 59 812 3344');
    expect(ai('هل الطقس جميل اليوم؟', {}, { unk: 'custom', unkMsg: 'سنعود إليك' })[0].text).toBe('سنعود إليك');
  });
  it('is silent when paused, replies in English to English, and never uses feminine address', () => {
    expect(ai('hello', { on: false })[0].k).toBe('sys');
    expect(ai('Do you open on Friday?')[0].text).toContain('closed on Fridays');
    expect(englishHours(hours)).toBe('We are open Saturday to Thursday, 9 AM to 7 PM. We are closed on Fridays.');
    const all = ['متى', 'سعر', 'حجز', 'خصم', 'شيء'].flatMap((t) => ai(t, {}, { lang: 'dialect' }).map((m) => m.text)).join(' ');
    expect(all).not.toMatch(/بكِ|عليكِ|اتصلي|بتحتاجي|فيكِ/);
  });
  it('tone and emoji switches', () => {
    expect(ai('متى')[0].text.startsWith('أهلاً بك!')).toBe(true);
    expect(ai('متى', {}, { tone: 'formal', emoji: false })[0].text.startsWith('مرحباً بكم.')).toBe(true);
    expect(ai('متى', {}, { emoji: false })[0].text).not.toContain('🌸');
  });
  it('onboarding answers still work', () => {
    expect(onboardingAnswer('ما هي أوقات العمل؟', { hoursText: 'ساعات', item: null, hasBookings: false })).toBe('ساعات');
  });
});
