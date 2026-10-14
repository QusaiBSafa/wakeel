import { redirect } from 'next/navigation';
import { dateTitle } from '@/lib/format';
import { loadHome } from '@/lib/server/loaders/home';
import { pageOwner, pageSession } from '@/lib/server/session';
import { minutesOf } from '@/lib/time';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الرئيسية · هُدهُد' };

export default async function Page() {
  const { business } = await pageSession();
  if (!business) redirect('/onboarding');
  const owner = await pageOwner();
  const data = await loadHome(business);
  const firstName = (owner?.name || '').split(' ')[0];
  const greeting = `${minutesOf(new Date(data.now)) < 12 * 60 ? 'صباح الخير' : 'مساء الخير'}${firstName ? '، ' + firstName : ''}`;
  return <HomeClient data={data} greeting={greeting} dateLine={`${dateTitle(data.today)} · إليك ملخص عملك اليوم.`} />;
}
