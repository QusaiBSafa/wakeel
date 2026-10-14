import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';

export const metadata = { title: 'الصفحة غير موجودة · هُدهُد' };

export default function NotFound() {
  return (
    <main className="auth-wrap">
      <div style={{ width: '100%', maxWidth: 480 }}>
        <EmptyState icon="info" tone="neutral" title="الصفحة غير موجودة" text="الرابط الذي فتحته غير صحيح أو لم تعد الصفحة متاحة.">
          <Link href="/dashboard" className="btn btn-primary">
            العودة إلى لوحة التحكم
          </Link>
        </EmptyState>
      </div>
    </main>
  );
}
