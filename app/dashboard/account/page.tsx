import { redirect } from 'next/navigation';
import { loadAccount } from '@/lib/server/loaders/account';
import { pageSession } from '@/lib/server/session';
import AccountClient, { type AccountTab } from './AccountClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعدادات الحساب · هُدهُد' };

const TABS: AccountTab[] = ['wa', 'team', 'plan', 'sections'];

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const { tab } = await searchParams;
  const initial = TABS.find((t) => t === tab) ?? 'wa';
  return <AccountClient data={await loadAccount(business)} initialTab={initial} />;
}
