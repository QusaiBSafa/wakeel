import { redirect } from 'next/navigation';
import { pageSession } from '@/lib/server/session';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعداد الحساب · هُدهُد' };

// Placeholder until P5 builds the 8-step wizard.
export default async function OnboardingPage() {
  const { business } = await pageSession();
  if (business?.onboardedAt) redirect('/dashboard');
  return (
    <main className="page" id="main">
      <h1>قيد التجهيز</h1>
    </main>
  );
}
