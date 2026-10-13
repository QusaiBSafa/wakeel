import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-wrap">
      <div className="card auth-card" style={{ textAlign: 'center', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>الصفحة مش موجودة</h1>
        <Link href="/dashboard" className="btn btn-primary">
          روح للوحة التحكم
        </Link>
      </div>
    </main>
  );
}
