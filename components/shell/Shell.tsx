'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ShellData } from '@/lib/types';
import MobileBar from './MobileBar';
import MobileDrawer from './MobileDrawer';
import { ShellProvider } from './ShellContext';
import Sidebar from './Sidebar';
import StagingBar from './StagingBar';

export default function Shell({ data, children }: { data: ShellData; children: React.ReactNode }) {
  const pathname = usePathname();
  // the drawer belongs to the page it was opened on, so navigating closes it
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  return (
    <ShellProvider value={data}>
      <Sidebar data={data} />
      <MobileBar data={data} open={open} onOpen={() => setOpenAt(pathname)} />
      {open && <MobileDrawer data={data} onClose={() => setOpenAt(null)} />}
      <div className="content">
        {data.staging && <StagingBar />}
        {children}
      </div>
    </ShellProvider>
  );
}
