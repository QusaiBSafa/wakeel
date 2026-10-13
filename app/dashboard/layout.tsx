import { redirect } from 'next/navigation';
import { pageSession } from '@/lib/server/session';
import { loadState } from '@/lib/server/state';
import { StoreProvider } from '@/components/app/Store';
import AppShell from '@/components/app/AppShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await pageSession();
  // no business yet, or onboarding never finished/skipped → back to the wizard
  if (!business || !business.onboardedAt) redirect('/onboarding');
  const state = await loadState(business);
  return (
    <StoreProvider initial={state}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
