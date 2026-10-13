import Logo from '@/components/ui/Logo';

export default function AuthCard({
  title,
  sub,
  children,
  footer,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="auth-wrap">
      <div className="card auth-card" data-clarity-mask="true">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, color: '#121A2E', alignSelf: 'flex-start', minHeight: 44, textDecoration: 'none' }}>
          <Logo size={30} />
          هُدهُد
        </a>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>{title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {sub}
          </p>
        </div>
        {children}
        {footer}
        <p className="hint" style={{ textAlign: 'center' }}>
          الحسابات محميّة عبر Clerk
        </p>
      </div>
    </main>
  );
}
