import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'تحتاج تدخلك · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>تحتاج تدخلك</h1>
          <p>يتوقف هُدهُد ويطلب رأيك عند الحاجة فقط. ردّ على العميل من هنا، أو افتح المحادثة في واتساب.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
