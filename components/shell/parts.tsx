import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { ShellData, WaState } from '@/lib/types';
import { SETTINGS, WA_CLS, WA_DOT, WA_TEXT, isActive, visibleNav, type NavItem } from './nav';

export function WaStatus({ state, compact }: { state: WaState; compact?: boolean }) {
  return (
    <span className={WA_CLS[state]} style={compact ? { fontSize: 12 } : undefined}>
      <span className={WA_DOT[state]} aria-hidden="true" />
      <span className={compact ? 'hide-m' : undefined}>{WA_TEXT[state]}</span>
    </span>
  );
}

function countOf(n: NavItem, data: ShellData): { n: number; cls: string; label: string } | null {
  if (n.k === 'attention' && data.counts.attention > 0) return { n: data.counts.attention, cls: 'count hot', label: `${data.counts.attention} طلبات مساعدة مفتوحة` };
  if (n.k === 'orders' && data.counts.newOrders > 0) return { n: data.counts.newOrders, cls: 'count warm', label: `${data.counts.newOrders} طلبات جديدة` };
  return null;
}

function Item({ n, pathname, data }: { n: NavItem; pathname: string; data: ShellData }) {
  const on = isActive(pathname, n.href);
  const c = countOf(n, data);
  return (
    <Link className={`${n.attn ? 'attn-link ' : ''}${on ? 'on' : ''}`.trim()} href={n.href} aria-current={on ? 'page' : undefined}>
      <Icon name={n.icon} />
      <span>{n.label}</span>
      {c && (
        <span className={c.cls} aria-label={c.label}>
          {c.n}
        </span>
      )}
    </Link>
  );
}

export function NavLinks({ data, pathname }: { data: ShellData; pathname: string }) {
  return (
    <nav className="nav" aria-label="أقسام لوحة التحكم">
      {visibleNav(data).map((n) => (
        <Item key={n.k} n={n} pathname={pathname} data={data} />
      ))}
      <div className="nav-sep">الإعدادات</div>
      {SETTINGS.map((n) => (
        <Item key={n.k} n={n} pathname={pathname} data={data} />
      ))}
    </nav>
  );
}
