import { redirect } from 'next/navigation';
import { pageSession } from '@/lib/server/session';
import { loadState } from '@/lib/server/state';
import { emptyState } from '@/lib/defaults';
import { StoreProvider } from '@/components/app/Store';
import Onboarding from '@/components/app/Onboarding';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'جهّز هُدهُد' };

export default async function OnboardingPage() {
  const { business } = await pageSession();
  if (business?.onboardedAt) redirect('/dashboard');
  const state = business ? await loadState(business) : emptyState();
  return (
    <StoreProvider initial={state}>
      <Onboarding hasBusiness={!!business} />
    </StoreProvider>
  );
}
