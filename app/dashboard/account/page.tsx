import { redirect } from 'next/navigation';
import { loadAccount } from '@/lib/server/loaders/account';
import { pageSession } from '@/lib/server/session';
import AccountClient from './AccountClient';
import { VISIBLE_ACCOUNT_TABS } from './tabs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعدادات الحساب · هُدهُد' };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const { tab } = await searchParams;
  const initial = VISIBLE_ACCOUNT_TABS.find((t) => t === tab) ?? 'wa';
  return <AccountClient data={await loadAccount(business)} initialTab={initial} />;
}
