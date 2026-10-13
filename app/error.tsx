'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { ErrorState } from '@/components/app/States';

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="shell" style={{ flexDirection: 'column' }}>
      <ErrorState
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
