import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={200} />
        </div>
      </div>
      <Busy style={{ gap: 12 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="card card-pad" style={{ display: 'flex', gap: 12 }}>
            <Skeleton w={44} h={44} r="50%" />
            <div className="col grow" style={{ gap: 10 }}>
              <Skeleton h={16} w="40%" />
              <Skeleton h={14} w="70%" />
              <Skeleton h={36} w="50%" />
            </div>
          </div>
        ))}
      </Busy>
    </main>
  );
}
