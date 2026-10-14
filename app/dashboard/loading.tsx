import Skeleton, { Busy } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="page" id="main">
      <Busy>
        <Skeleton h={34} w={220} />
        <Skeleton h={140} />
      </Busy>
    </main>
  );
}
