import { SignUp } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';

export const metadata = { title: 'أنشئ حسابك · هُدهُد' };

export default function Page() {
  return (
    <AuthCard title="أنشئ حسابك في هُدهُد" sub="جهّز هُدهُد ليرد على عملائك عبر واتساب.">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
    </AuthCard>
  );
}
