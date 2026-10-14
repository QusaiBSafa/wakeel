'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';
import type { ShellData } from '@/lib/types';
import { NavLinks, WaStatus } from './parts';

export function BusinessCard({ data }: { data: ShellData }) {
  return (
    <div className="biz">
      <Avatar name={data.business.name} color={data.business.color} />
      <div className="grow">
        <b className="trunc">{data.business.name}</b>
        <WaStatus state={data.wa} />
      </div>
    </div>
  );
}

export function OwnerFooter({ data, safeBottom }: { data: ShellData; safeBottom?: boolean }) {
  return (
    <div className="sb-foot" style={safeBottom ? { paddingBottom: 'max(12px, env(safe-area-inset-bottom))' } : undefined}>
      <Avatar name={data.owner.name} color={1} size="sm" />
      <div className="grow" style={{ lineHeight: 1.35 }}>
        <b className="trunc" style={{ display: 'block', fontSize: 14 }}>
          {data.owner.name}
        </b>
        <span className="subtle">مالك الحساب</span>
      </div>
      <Link className="ib sm" href="/dashboard/account" aria-label="إعدادات الحساب">
        <Icon name="gear" />
      </Link>
      <UserButton />
    </div>
  );
}

export default function Sidebar({ data }: { data: ShellData }) {
  const pathname = usePathname();
  return (
    <aside className="sb" aria-label="القائمة الرئيسية">
      <div className="sb-top">
        <Link className="wordmark" href="/dashboard">
          <Logo size={28} />
          هُدهُد
        </Link>
        <BusinessCard data={data} />
      </div>
      <NavLinks data={data} pathname={pathname} />
      <OwnerFooter data={data} />
    </aside>
  );
}
