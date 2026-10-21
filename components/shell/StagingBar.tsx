'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client/api';
import { useToast } from '@/components/ui/Toast';

/** Shown only when NEXT_PUBLIC_HUDHUD_STAGING=1: explains the stubs and offers demo data. */
export default function StagingBar() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<'seed' | 'clear' | null>(null);

  async function run(kind: 'seed' | 'clear') {
    setBusy(kind);
    try {
      await api(kind === 'seed' ? 'POST' : 'DELETE', '/api/app/dev/seed');
      toast(kind === 'seed' ? 'أُضيفت البيانات التجريبية' : 'مُسحت البيانات التجريبية');
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="staging-bar" role="note">
      <b>نسخة تجريبية:</b>
      <span>ربط واتساب وإرسال الرسائل محاكاة، ولا يُرسل شيء إلى العملاء.</span>
      <span className="grow" style={{ flex: '1 1 0' }} />
      <button type="button" className="btn btn-sm" onClick={() => run('seed')} disabled={busy !== null}>
        أضف بيانات تجريبية
      </button>
      <button type="button" className="btn btn-sm" onClick={() => run('clear')} disabled={busy !== null}>
        امسح البيانات التجريبية
      </button>
    </div>
  );
}
