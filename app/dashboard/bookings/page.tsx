import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الحجوزات · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>الحجوزات</h1>
          <p>مواعيد اليوم والأسبوع، وأوقات العمل التي يحجز فيها هُدهُد.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
