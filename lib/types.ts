import type { Category, Currency, PaymentMethod } from './constants';
import type { Day } from './slots';

export type BusinessDTO = {
  name: string;
  category: Category;
  description: string;
  logoUrl: string | null;
  address: string;
  mapUrl: string;
  phone: string;
  socials: { instagram: string; facebook: string; tiktok: string; website: string };
  paymentMethods: PaymentMethod[];
  delivery: { enabled: boolean; areas: string; fee: string; time: string };
  hoursMode: 'booking' | 'custom';
  hoursText: string;
  onboardingStep: number;
  onboarded: boolean;
};

export type ProductDTO = {
  id: string;
  sku: string;
  name: string;
  priceMinor: number;
  currency: Currency;
  description: string;
  imageUrl: string | null;
};

export type BookingDTO = {
  enabled: boolean;
  slotMinutes: number;
  bufferMinutes: number;
  days: Day[]; // 7 entries, Saturday first
};

export type ClosureDTO = { id: string; date: string; note: string };

export type FaqDTO = {
  id: string;
  templateKey: string | null;
  question: string;
  answer: string;
  status: 'open' | 'answered' | 'skipped';
  position: number;
};

export type AppState = {
  business: BusinessDTO;
  products: ProductDTO[];
  booking: BookingDTO;
  closures: ClosureDTO[];
  faqs: FaqDTO[];
  notified: boolean;
};
