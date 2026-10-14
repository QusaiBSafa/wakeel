'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="page" id="main">
      <ErrorCard
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
