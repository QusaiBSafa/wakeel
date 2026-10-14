'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { useFocusTrap } from '@/components/ui/useFocusTrap';
import type { ShellData } from '@/lib/types';
import { NavLinks } from './parts';
import { BusinessCard, OwnerFooter } from './Sidebar';

export default function MobileDrawer({ data, onClose }: { data: ShellData; onClose: () => void }) {
  const pathname = usePathname();
  const ref = useFocusTrap<HTMLElement>(true, onClose);
  return (
    <>
      <div className="mscrim" onClick={onClose} />
      <aside ref={ref} id="m-drawer" className="mdrawer" role="dialog" aria-modal="true" aria-label="القائمة الرئيسية">
        <div className="sb-top">
          <div className="row">
            <Link className="wordmark grow" href="/dashboard">
              <Logo size={26} />
              هُدهُد
            </Link>
            <button type="button" className="ib" onClick={onClose} aria-label="إغلاق القائمة">
              <Icon name="close" />
            </button>
          </div>
          <BusinessCard data={data} />
        </div>
        <NavLinks data={data} pathname={pathname} />
        <OwnerFooter data={data} safeBottom />
      </aside>
    </>
  );
}
