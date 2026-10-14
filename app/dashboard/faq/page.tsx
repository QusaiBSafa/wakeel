import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'الأسئلة الشائعة · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>الأسئلة الشائعة</h1>
          <p>أجوبة جاهزة يستخدمها هُدهُد كما كتبتها. أضف الأسئلة التي يكرّرها عملاؤك.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
