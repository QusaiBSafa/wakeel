'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function AccountError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main">
      <ErrorCard
        title="تعذّر تحميل الصفحة"
        text="حدثت مشكلة في الاتصال."
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
