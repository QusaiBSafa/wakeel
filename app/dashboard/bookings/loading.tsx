import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={200} />
        </div>
      </div>
      <Busy>
        <Skeleton h={520} r={16} />
      </Busy>
    </main>
  );
}
