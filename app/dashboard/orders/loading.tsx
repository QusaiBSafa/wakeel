import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <Skeleton h={30} w={160} />
        </div>
      </div>
      <Busy className="card">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 20px', borderBottom: '1px solid #E6E9F0' }}>
            <Skeleton h={16} w={60} />
            <Skeleton h={16} style={{ flex: 1 }} />
            <Skeleton h={16} w={90} />
          </div>
        ))}
      </Busy>
    </main>
  );
}
