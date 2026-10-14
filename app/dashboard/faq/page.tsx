import { redirect } from 'next/navigation';
import { loadFaq } from '@/lib/server/loaders/faq';
import { pageSession } from '@/lib/server/session';
import FaqClient from './FaqClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الأسئلة الشائعة · هُدهُد' };

export default async function Page() {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  return <FaqClient data={await loadFaq(business)} />;
}
