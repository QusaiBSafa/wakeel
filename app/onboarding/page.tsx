import { redirect } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import { loadOnboarding } from '@/lib/server/loaders/onboarding';
import { pageOwner, pageSession } from '@/lib/server/session';
import OnboardingClient from './OnboardingClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعداد الحساب · هُدهُد' };

export default async function OnboardingPage() {
  const { business } = await pageSession();
  if (business?.onboardedAt) redirect('/dashboard');
  const { business: data } = await loadOnboarding(business);
  const owner = business ? await pageOwner() : null;
  return (
    <AppProviders>
      <OnboardingClient business={data} firstName={(owner?.name || '').split(' ')[0]} />
    </AppProviders>
  );
}
