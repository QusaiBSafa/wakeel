import { redirect } from 'next/navigation';
import { loadAttention } from '@/lib/server/loaders/attention';
import { pageSession } from '@/lib/server/session';
import AttentionClient from './AttentionClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تحتاج تدخلك · هُدهُد' };

export default async function Page() {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  return <AttentionClient data={await loadAttention(business)} />;
}
