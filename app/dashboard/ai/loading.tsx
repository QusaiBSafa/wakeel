import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={220} />
        </div>
      </div>
      <Busy className="split">
        <div className="col" style={{ gap: 16 }}>
          <Skeleton h={96} r={16} />
          <Skeleton h={220} r={16} />
          <Skeleton h={260} r={16} />
        </div>
        <Skeleton h={480} r={16} />
      </Busy>
    </main>
  );
}
