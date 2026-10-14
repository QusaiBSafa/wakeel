'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function AttentionError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main" style={{ maxWidth: 980 }}>
      <ErrorCard
        title="تعذّر تحميل الطلبات"
        text="حدثت مشكلة في الاتصال. إذا طال انتظار أي عميل، يعتذر له هُدهُد ويبلغه بأنك سترد قريباً."
        onRetry={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      />
    </main>
  );
}
