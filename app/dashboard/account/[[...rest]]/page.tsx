import { UserProfile } from '@clerk/nextjs';

export const metadata = { title: 'حسابي · هُدهُد' };

export default function AccountPage() {
  return (
    <>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>حسابي</h1>
        <p className="muted">الإيميل، كلمة المرور، وتسجيل الخروج.</p>
      </div>
      <div data-clarity-mask="true" style={{ maxWidth: '100%', overflowX: 'auto' }}>
        <UserProfile path="/dashboard/account" routing="path" />
      </div>
    </>
  );
}
