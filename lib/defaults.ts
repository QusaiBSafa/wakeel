import type { AppState } from './types';

/** State shown in the onboarding wizard before the business row exists. */
export function emptyState(): AppState {
  return {
    business: {
      name: '',
      category: 'other',
      description: '',
      logoUrl: null,
      address: '',
      mapUrl: '',
      phone: '',
      socials: { instagram: '', facebook: '', tiktok: '', website: '' },
      paymentMethods: [],
      delivery: { enabled: false, areas: '', fee: '', time: '' },
      hoursMode: 'booking',
      hoursText: '',
      onboardingStep: 0,
      onboarded: false,
    },
    products: [],
    booking: {
      enabled: false,
      slotMinutes: 30,
      bufferMinutes: 0,
      days: Array.from({ length: 7 }, (_, i) => ({ on: i !== 6, ranges: [{ s: '09:00', e: '17:00' }] })),
    },
    closures: [],
    faqs: [],
    notified: false,
  };
}
