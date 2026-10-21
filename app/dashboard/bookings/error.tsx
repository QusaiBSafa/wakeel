'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function BookingsError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main">
      <ErrorCard
        title="تعذّر تحميل التقويم"
        text="الحجوزات محفوظة، ولا يزال هُدهُد يستقبل حجوزات العملاء."
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
