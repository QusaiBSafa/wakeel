import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الطلبات · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>الطلبات</h1>
          <p>الطلبات التي سجّلها هُدهُد من واتساب، والطلبات التي أضفتها بنفسك.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
