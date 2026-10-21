'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function CatalogError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main">
      <ErrorCard
        title="تعذّر تحميل القائمة"
        text="لا يزال هُدهُد يستخدم آخر نسخة محفوظة من منتجاتك."
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
