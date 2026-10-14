// Client-only test chat rules. Nothing here is sent to or stored on the server.
import { formatMoney } from '../format';

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
