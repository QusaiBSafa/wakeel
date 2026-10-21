import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={240} />
        </div>
      </div>
      <Busy className="pgrid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card pcard">
            <Skeleton h={150} />
            <Skeleton h={16} w="70%" />
            <Skeleton h={14} w="40%" />
          </div>
        ))}
      </Busy>
    </main>
  );
}
