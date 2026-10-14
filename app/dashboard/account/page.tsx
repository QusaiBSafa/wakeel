import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعدادات الحساب · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>إعدادات الحساب</h1>
          <p>ربط واتساب، وفريق العمل، والاشتراك، والأقسام الظاهرة في لوحة التحكم.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
