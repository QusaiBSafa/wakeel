import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'إعدادات هُدهُد · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>إعدادات هُدهُد</h1>
          <p>حدّد كيف يرد هُدهُد على عملائك، وما الذي يُسمح له بفعله، ومتى يحوّل الأمر إليك.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
