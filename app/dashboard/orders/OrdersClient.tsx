'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import OrderCards from '@/components/orders/OrderCards';
import OrderDrawer from '@/components/orders/OrderDrawer';
import OrdersTable from '@/components/orders/OrdersTable';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import Tabs from '@/components/ui/Tabs';
import { ORDER_STATUS, ORDER_STATUS_KEYS, type OrderStatus } from '@/lib/constants';
import { dayStart, ymd } from '@/lib/time';
import type { OrdersData } from '@/lib/server/loaders/orders';
import type { OrderDTO } from '@/lib/types';

type Range = 'all' | 'today' | 'week';
type Open = { id: string } | 'new' | null;

export default function OrdersClient({ data, initialId }: { data: OrdersData; initialId: string | null }) {
  const router = useRouter();
  const [src, setSrc] = useState(data);
  const [orders, setOrders] = useState<OrderDTO[]>(data.orders);
  if (src !== data) {
    setSrc(data);
    setOrders(data.orders);
  }
  const [tab, setTab] = useState<'all' | OrderStatus>('all');
  const [q, setQ] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [open, setOpen] = useState<Open>(initialId ? { id: initialId } : null);
  const now = new Date(data.now).getTime();
  const areaFees = new Map(data.areas.map((a) => [a.id, a.feeMinor]));

  const counts = Object.fromEntries(ORDER_STATUS_KEYS.map((k) => [k, orders.filter((o) => o.status === k).length])) as Record<OrderStatus, number>;
  const todayStart = dayStart(ymd(now)).getTime();
  const term = q.trim().replace('#', '');
  const digits = term.replace(/\s/g, '');
  const list = orders.filter((o) => {
    if (tab !== 'all' && o.status !== tab) return false;
    const t = new Date(o.createdAt).getTime();
    if (range === 'today' && t < todayStart) return false;
    if (range === 'week' && t < todayStart - 6 * 86400000) return false;
    return !term || String(o.number).includes(term) || o.customerName.includes(term) || o.customerPhone.replace(/\s/g, '').includes(digits);
  });
  const current = open && open !== 'new' ? orders.find((o) => o.id === open.id) ?? null : null;
  const clear = () => {
    setQ('');
    setTab('all');
    setRange('all');
  };

  const tabs = [
    { value: 'all' as const, label: 'الكل', count: orders.length },
    ...ORDER_STATUS_KEYS.map((k) => ({ value: k, label: ORDER_STATUS[k].label, count: counts[k], countCls: k === 'new' && counts[k] ? 'warm' : '' })),
  ];

  return (
    <main className="page" id="main" data-clarity-mask="true">
      <div className="page-head">
        <div className="t">
          <h1>الطلبات</h1>
          <p>الطلبات التي سجّلها هُدهُد من واتساب، والطلبات التي أضفتها بنفسك.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setOpen('new')}>
          <Icon name="plus" />
          طلب جديد
        </button>
      </div>

      <Tabs label="حالة الطلب" value={tab} onChange={setTab} tabs={tabs} />

      <div className="toolbar">
        <div className="search" style={{ flex: '1 1 260px' }}>
          <Icon name="search" />
          <label htmlFor="o-q" className="sr-only">
            ابحث في الطلبات
          </label>
          <input id="o-q" className="input" type="search" placeholder="ابحث برقم الطلب أو الاسم أو رقم الهاتف" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="o-date">
          الفترة
        </label>
        <select id="o-date" className="input" style={{ width: 'auto', minWidth: 150 }} value={range} onChange={(e) => setRange(e.target.value as Range)}>
          <option value="all">كل الفترات</option>
          <option value="today">اليوم</option>
          <option value="week">آخر 7 أيام</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <EmptyState icon="bag" tone="indigo" title="لا توجد طلبات بعد" text="عندما يطلب عميل عبر واتساب، يسجّل هُدهُد الطلب هنا وينتظر تأكيدك. يمكنك أيضاً إضافة طلب بنفسك.">
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen('new')}>
              أضف طلب
            </button>
            <Link className="btn btn-secondary btn-sm" href="/dashboard/catalog">
              راجع المنتجات
            </Link>
          </div>
        </EmptyState>
      ) : list.length === 0 ? (
        <div className="card empty">
          <b>لا توجد طلبات مطابقة للبحث</b>
          <p className="muted" style={{ fontSize: 14 }}>
            جرّب كلمة أخرى أو امسح عوامل التصفية.
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>
            مسح عوامل التصفية
          </button>
        </div>
      ) : (
        <>
          <OrdersTable orders={list} now={now} areaFees={areaFees} selectedId={current?.id ?? null} onOpen={(id) => setOpen({ id })} />
          <OrderCards orders={list} now={now} onOpen={(id) => setOpen({ id })} />
        </>
      )}

      {open && (open === 'new' || current) && (
        <OrderDrawer
          key={open === 'new' ? 'new' : open.id}
          order={current}
          data={data}
          onClose={() => setOpen(null)}
          onSaved={(o, isNew) => {
            setOrders((all) => (isNew ? [o, ...all] : all.map((x) => (x.id === o.id ? o : x))));
            if (isNew) setOpen({ id: o.id });
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
