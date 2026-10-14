import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={220} />
        </div>
      </div>
      <Busy style={{ gap: 16 }}>
        <Skeleton h={84} r={16} />
        <div className="grid-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} h={118} r={16} />
          ))}
        </div>
        <div className="split">
          <Skeleton h={340} r={16} />
          <Skeleton h={340} r={16} />
        </div>
      </Busy>
    </main>
  );
}
