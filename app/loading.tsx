import { Busy } from '@/components/ui/Skeleton';
import Skeleton from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <main className="auth-wrap">
      <Busy style={{ width: '100%', maxWidth: 440, gap: 12 }}>
        <Skeleton h={34} w={140} />
        <Skeleton h={120} />
      </Busy>
    </main>
  );
}
