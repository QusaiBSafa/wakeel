import { PageSkeleton } from '@/components/app/States';

export default function Loading() {
  return (
    <>
      <div className="top" style={{ minHeight: 66 }}>
        <div className="skel" style={{ height: 34, width: 120 }} />
      </div>
      <div className="shell">
        <div className="main">
          <PageSkeleton />
        </div>
      </div>
    </>
  );
}
