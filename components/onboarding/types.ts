import type { Offers } from '@/lib/constants';
import type { DayHours, FaqRow } from '@/lib/onboarding';

export type OnbRow = { id?: string; kind: 'service' | 'product'; name: string; price: string; dur: string };
export type OnbZone = { name: string; on: boolean; fee: string };
export type OnbInfo = { name: string; city: string; phone: string; addr: string; desc: string };

export type OnbState = {
  type: string;
  offers: Offers;
  f: OnbInfo;
  hours: DayHours[];
  rows: OnbRow[];
  zones: OnbZone[];
  freeOver: string;
  faqs: FaqRow[] | null;
  chat: { k: 'in' | 'ai'; text: string }[];
};
