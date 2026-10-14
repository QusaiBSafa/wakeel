import { redirect } from 'next/navigation';
import { pageSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';

// Placeholder until P4 builds the v2 shell.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  return <>{children}</>;
}
