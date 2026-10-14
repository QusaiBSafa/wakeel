'use client';

import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import type { ShellData } from '@/lib/types';
import { WaStatus } from './parts';

export default function MobileBar({ data, open, onOpen }: { data: ShellData; open: boolean; onOpen: () => void }) {
  const n = data.counts.attention;
  return (
    <header className="mbar">
      <button type="button" className="ib" onClick={onOpen} aria-label="فتح القائمة" aria-expanded={open} aria-controls="m-drawer">
        <Icon name="menu" />
      </button>
      <Link className="wordmark" href="/dashboard" style={{ fontSize: 20 }}>
        <Logo size={22} />
        هُدهُد
      </Link>
      <span className="grow" />
      <WaStatus state={data.wa} compact />
      <Link className="ib" href="/dashboard/attention" aria-label={`طلبات تحتاج تدخلك: ${n}`} style={{ position: 'relative', color: '#9A4A06' }}>
        <Icon name="bell" />
        {n > 0 && (
          <span className="count hot" style={{ position: 'absolute', top: 2, left: 2, minWidth: 18, height: 18, fontSize: 11 }}>
            {n}
          </span>
        )}
      </Link>
    </header>
  );
}
