import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={200} />
        </div>
      </div>
      <Skeleton h={44} r={12} style={{ marginBottom: 20 }} />
      <Busy>
        <Skeleton h={220} r={16} />
        <Skeleton h={160} r={16} />
      </Busy>
    </main>
  );
}
