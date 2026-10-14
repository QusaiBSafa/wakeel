import EmptyState from '@/components/ui/EmptyState';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'المنتجات والخدمات · هُدهُد' };

// Placeholder: replaced by the real page in a later phase.
export default function Page() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>المنتجات والخدمات</h1>
          <p>يجيب هُدهُد العملاء عن الأسعار والتوفّر من هذه القائمة، ويسجّل منها الطلبات والحجوزات.</p>
        </div>
      </div>
      <EmptyState icon="info" tone="neutral" title="قيد التجهيز" />
    </main>
  );
}
