import { redirect } from 'next/navigation';
import { loadOrders } from '@/lib/server/loaders/orders';
import { pageSession } from '@/lib/server/session';
import OrdersClient from './OrdersClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الطلبات · هُدهُد' };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const { id } = await searchParams;
  return <OrdersClient data={await loadOrders(business)} initialId={id ?? null} />;
}
