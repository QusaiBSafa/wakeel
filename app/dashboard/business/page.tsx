import { redirect } from 'next/navigation';
import { loadBusiness } from '@/lib/server/loaders/business';
import { pageSession } from '@/lib/server/session';
import BusinessClient from './BusinessClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'معلومات نشاطك · هُدهُد' };

export default async function Page() {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  return <BusinessClient data={await loadBusiness(business)} />;
}
