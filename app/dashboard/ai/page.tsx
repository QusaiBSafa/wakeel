import { redirect } from 'next/navigation';
import { loadAi } from '@/lib/server/loaders/ai';
import { pageSession } from '@/lib/server/session';
import AiClient from './AiClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعدادات هُدهُد · هُدهُد' };

export default async function Page() {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  return <AiClient data={await loadAi(business)} />;
}
