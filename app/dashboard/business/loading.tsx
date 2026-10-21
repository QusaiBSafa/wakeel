import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={220} />
        </div>
      </div>
      <Busy style={{ gap: 16 }}>
        <Skeleton h={90} r={16} />
        <Skeleton h={200} r={16} />
        <Skeleton h={200} r={16} />
      </Busy>
    </main>
  );
}
