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
        <a className="wordmark" href="/" style={{ alignSelf: 'flex-start' }}>
          <Logo size={30} />
          هُدهُد
        </a>
        <div>
          <h1>{title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {sub}
          </p>
        </div>
        {children}
        {footer}
        <p className="hint" style={{ textAlign: 'center' }}>
          الحسابات محمية عبر Clerk
        </p>
      </div>
    </main>
  );
}
