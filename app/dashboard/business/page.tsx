import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'معلومات نشاطك · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>معلومات نشاطك</h1>
          <p>يستخدم هُدهُد هذه المعلومات للإجابة عن أسئلة العملاء. كلما كانت أدق، كانت ردوده أفضل.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
