import { SignIn } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';

export const metadata = { title: 'تسجيل الدخول · هُدهُد' };

export default function Page() {
  return (
    <AuthCard title="أهلاً بعودتك" sub="سجّل الدخول لمتابعة إدارة نشاطك.">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" />
    </AuthCard>
  );
}
