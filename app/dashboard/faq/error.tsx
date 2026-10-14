'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function FaqError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main" style={{ maxWidth: 1100 }}>
      <ErrorCard
        title="تعذّر تحميل الأسئلة"
        text="لا يزال هُدهُد يستخدم آخر نسخة محفوظة من أجوبتك."
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
