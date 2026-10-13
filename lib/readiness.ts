import type { AppState } from './types';
import { weekSlotCount } from './slots';
import { HOURS_TEMPLATE_KEY } from './constants';

const has = (v: unknown) => !!String(v ?? '').trim();

export function isAutoFaq(f: { templateKey: string | null }) {
  return f.templateKey === HOURS_TEMPLATE_KEY;
}

export function infoChecks(s: AppState): [string, boolean][] {
  const b = s.business;
  return [
    ['الاسم', has(b.name)],
    ['نوع الشركة', has(b.category)],
    ['الوصف', has(b.description)],
    ['العنوان', has(b.address)],
    ['رقم التواصل', has(b.phone)],
    ['الشعار', !!b.logoUrl],
    ['حساب تواصل اجتماعي', has(b.socials.instagram) || has(b.socials.facebook) || has(b.socials.tiktok) || has(b.socials.website)],
    ['طرق الدفع', b.paymentMethods.length > 0],
  ];
}

/** Counts used by the home page, sidebar and FAQ header (same formula as the prototype). */
export function readiness(s: AppState) {
  const checks = infoChecks(s);
  const infoDone = checks.filter((c) => c[1]).length;
  const faqTotal = s.faqs.length;
  const faqAnswered = s.faqs.filter((f) => f.status === 'answered' || isAutoFaq(f)).length;
  const faqHandled = s.faqs.filter((f) => f.status !== 'open' || isAutoFaq(f)).length;
  const prodOk = s.products.length > 0;
  const bookOk = s.booking.enabled && s.booking.days.some((d) => d.on);
  const weekSlots = s.booking.enabled ? weekSlotCount(s.booking.days, s.booking.slotMinutes, s.booking.bufferMinutes) : 0;
  const pct = Math.round(30 * (infoDone / 8) + 30 * (faqTotal ? faqHandled / faqTotal : 0) + (prodOk ? 20 : 0) + (bookOk ? 20 : 0));
  return { checks, infoDone, faqTotal, faqAnswered, faqHandled, prodOk, bookOk, weekSlots, pct };
}
