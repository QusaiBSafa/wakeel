'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function AiError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main">
      <ErrorCard
        title="تعذّر تحميل الإعدادات"
        text="لا يزال هُدهُد يعمل بآخر إعدادات محفوظة."
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
