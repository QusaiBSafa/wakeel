import { redirect } from 'next/navigation';
import { loadBookings } from '@/lib/server/loaders/bookings';
import { pageSession } from '@/lib/server/session';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الحجوزات · هُدهُد' };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string; id?: string }> }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const { tab, id } = await searchParams;
  return <BookingsClient data={await loadBookings(business)} initialTab={tab === 'settings' ? 'set' : 'cal'} initialId={id ?? null} />;
}
