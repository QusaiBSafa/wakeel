'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="auth-wrap">
      <div style={{ width: '100%', maxWidth: 480 }}>
        <ErrorCard
          onRetry={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        />
      </div>
    </main>
  );
}
