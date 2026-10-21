import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="ob-center" id="main">
      <Busy style={{ maxWidth: 560, margin: '0 auto', gap: 14 }}>
        <Skeleton h={34} w={220} />
        <Skeleton h={260} r={16} />
      </Busy>
    </main>
  );
}
