'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { ErrorState } from '@/components/app/States';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <ErrorState
      onRetry={() =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
