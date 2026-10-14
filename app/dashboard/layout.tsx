import { redirect } from 'next/navigation';
import AppProviders from '@/components/AppProviders';
import Shell from '@/components/shell/Shell';
import { loadShell } from '@/lib/server/loaders/shell';
import { pageOwner, pageSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await pageSession();
  // no business yet → the wizard. An unfinished onboarding does not redirect: Home shows the banner instead.
  if (!business) redirect('/onboarding');
  const owner = await pageOwner();
  const data = await loadShell(business, owner?.name || business.name);
  return (
    <AppProviders>
      <Shell data={data}>{children}</Shell>
    </AppProviders>
  );
}
