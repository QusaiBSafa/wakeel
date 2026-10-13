import { SignUp } from '@clerk/nextjs';
import AuthCard from '@/components/AuthCard';
import { Icon } from '@/components/ui/icons';

export const metadata = { title: 'أنشئ حسابك · هُدهُد' };

export default function Page() {
  return (
    <AuthCard
      title="أنشئ حسابك"
      sub="بدقيقتين بتجهّز هُدهُد على واتساب."
      footer={
        <div className="alert ok" style={{ fontSize: 14 }}>
          <Icon name="check" />
          <div>ما في رمز تحقق. بتنشئ الحساب وبتبلّش فوراً.</div>
        </div>
      }
    >
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" forceRedirectUrl="/onboarding" />
    </AuthCard>
  );
}
