'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function BusinessError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main" style={{ maxWidth: 1100 }}>
      <ErrorCard
        title="تعذّر تحميل معلومات نشاطك"
        text="لا يزال هُدهُد يستخدم آخر نسخة محفوظة من المعلومات."
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
