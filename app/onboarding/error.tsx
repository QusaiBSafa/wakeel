'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import ErrorCard from '@/components/ui/ErrorCard';

export default function OnboardingError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main className="ob-center" id="main">
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
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
