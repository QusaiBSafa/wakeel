import type { AiConfig } from '../types';
import { hoursSentence, type DayHours } from '../onboarding';
import { formatMoney } from '../format';
// Client-only test chat rules. Nothing here is sent to or stored on the server.

export type ChatMsg = { k: 'in' | 'ai' | 'sys'; text: string };

export type OnboardingChatCtx = {
  hoursText: string;
  item: { name: string; priceMinor: number; durationMin: number | null } | null;
  hasBookings: boolean;
};

/** Port of the onboarding prototype's answer(): hours, prices, or a booking offer. */
export function onboardingAnswer(text: string, c: OnboardingChatCtx): string {
  if (/أوقات|متى|دوام/.test(text)) return c.hoursText;
  if (/سعر|كم|بكم/.test(text)) {
    if (!c.item) return 'سيخبرك فريقنا بالسعر قريباً.';
    const dur = c.item.durationMin ? `، وتستغرق نحو ${c.item.durationMin} دقيقة` : '';
    return `سعر ${c.item.name} ${formatMoney(c.item.priceMinor)}${dur}. ${c.hasBookings ? 'هل تودّ حجز موعد؟' : 'هل تودّ الطلب؟'}`;
  }
  return c.hasBookings ? 'يسعدنا ذلك! لدينا غداً موعد متاح الساعة 10:30 صباحاً. هل يناسبك؟' : 'يسعدنا ذلك! هل تودّ إتمام طلبك الآن؟';
}

// ---------- «إعدادات هُدهُد» test chat (port of the prototype's reply(), generic masculine, real business data) ----------

export type AiChatCtx = {
  cfg: AiConfig;
  /** the master switch */
  on: boolean;
  business: { name: string; phone: string };
  hours: DayHours[];
  item: { name: string; priceMinor: number } | null;
};

const EN_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const enTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

export function englishHours(hours: DayHours[]): string {
  const open = hours.map((h, i) => ({ ...h, i })).filter((h) => h.on);
  if (!open.length) return 'We are currently closed.';
  const same = open.every((h) => h.from === open[0].from && h.to === open[0].to);
  const contiguous = open.every((h, k) => k === 0 || h.i === open[k - 1].i + 1);
  const days = contiguous && open.length > 1 ? `${EN_DAYS[open[0].i]} to ${EN_DAYS[open[open.length - 1].i]}` : open.map((h) => EN_DAYS[h.i]).join(', ');
  const closed = hours.map((h, i) => ({ ...h, i })).filter((h) => !h.on);
  return `We are open ${days}${same ? `, ${enTime(open[0].from)} to ${enTime(open[0].to)}` : ''}.${closed.length === 1 ? ` We are closed on ${EN_DAYS[closed[0].i]}s.` : ''}`;
}

export function aiReply(text: string, c: AiChatCtx): ChatMsg[] {
  const { cfg } = c;
  if (!c.on) return [{ k: 'sys', text: 'الردود التلقائية متوقفة، ولن يرد هُدهُد على هذه الرسالة.' }];
  const d = cfg.lang === 'dialect';
  const latin = /[a-z]/i.test(text) && !/[؀-ۿ]/.test(text);
  const em = cfg.emoji ? ' 🌸' : '';
  const pre = cfg.tone === 'friendly' ? (d ? 'أهلين فيك! ' : 'أهلاً بك! ') : cfg.tone === 'formal' ? 'مرحباً بكم. ' : '';
  const post = cfg.tone === 'friendly' ? (d ? ' إذا بتحتاج أي إشي ثاني أنا هون.' : ' هل يمكنني مساعدتك في شيء آخر؟') : '';
  const hand = (why: string): ChatMsg[] => [
    { k: 'ai', text: pre + (d ? 'رح أحوّل سؤالك لفريق المكان، وبيردّوا عليك بأقرب وقت.' : 'سأحوّل سؤالك إلى فريقنا، وسيردّون عليك في أقرب وقت.') + em },
    { k: 'sys', text: `حُوّلت إلى «تحتاج تدخلك»: ${why}` },
  ];
  const hoursAr = hoursSentence(c.hours);
  if (latin && cfg.lang === 'match') {
    if (/fri/i.test(text)) return [{ k: 'ai', text: (cfg.tone === 'short' ? '' : 'Hello! ') + englishHours(c.hours) + em }];
    return [{ k: 'ai', text: `Hello! ${englishHours(c.hours)} How can I help you?${em}` }];
  }
  if (/خصم|تخفيض|عرض/.test(text)) {
    if (cfg.rules.discount) return hand('طلب خصم');
    return [{ k: 'ai', text: pre + (d ? 'للأسف ما في خصومات حالياً.' : 'لا توجد خصومات حالياً.') + em }];
  }
  if (/احجز|أحجز|موعد|حجز|بدي أحجز|أريد حجز/.test(text)) {
    if (!cfg.perms.bookings) return hand('طلب حجز');
    const base = d ? 'أكيد! بكرا عنّا مواعيد متاحة. أي وقت بناسبك؟' : 'يسعدنا ذلك! لدينا غداً مواعيد متاحة. أي وقت يناسبك؟';
    const out: ChatMsg[] = [{ k: 'ai', text: (cfg.tone === 'short' ? '' : pre) + base + em }];
    if (cfg.mode === 'approve') out.push({ k: 'sys', text: 'بعد اختيار الموعد: يبقى الحجز بانتظار موافقتك' });
    return out;
  }
  if (/سعر|كم|بكم/.test(text)) {
    if (!cfg.perms.prices) return [{ k: 'ai', text: pre + (d ? 'رح يبعتلك الفريق الأسعار بأقرب وقت.' : 'سيرسل لك فريقنا الأسعار في أقرب وقت.') + em }];
    if (!c.item) return hand('سؤال عن سعر غير موجود في القائمة');
    const p = formatMoney(c.item.priceMinor);
    return [{ k: 'ai', text: pre + (d ? `سعر ${c.item.name} ${p}.` : `سعر ${c.item.name} ${p}.`) + post + em }];
  }
  if (/متى|تفتح|ساعات|دوام|مفتوح/.test(text)) return [{ k: 'ai', text: pre + hoursAr + post + em }];
  if (cfg.unk === 'call') return [{ k: 'ai', text: pre + (d ? `حتى أفيدك أكثر، اتصل فينا على ${c.business.phone}.` : `لمساعدتك بشكل أفضل، يرجى الاتصال بنا على الرقم ${c.business.phone}.`) + em }];
  if (cfg.unk === 'custom') return [{ k: 'ai', text: cfg.unkMsg }, { k: 'sys', text: 'حُوّلت إلى «تحتاج تدخلك»: سؤال بلا جواب' }];
  return hand('سؤال بلا جواب');
}
