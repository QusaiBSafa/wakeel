'use client';

import { ORDER_STATUS } from '@/lib/constants';
import { formatMoney, relDay } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';
import { itemsText } from './OrdersTable';

export default function OrderCards({ orders, now, onOpen }: { orders: OrderDTO[]; now: number; onOpen: (id: string) => void }) {
  return (
    <ul className="only-m col" style={{ gap: 10 }}>
      {orders.map((o) => (
        <li key={o.id}>
          <button type="button" className="card" onClick={() => onOpen(o.id)} style={{ width: '100%', textAlign: 'start', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer' }}>
            <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
              <b className="ltr num">#{o.number}</b>
              <span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span>
            </span>
            <span className="row" style={{ justifyContent: 'space-between', width: '100%', gap: 8 }}>
              <span style={{ fontWeight: 600 }}>{o.customerName}</span>
              <b className="num">{formatMoney(o.totalMinor)}</b>
            </span>
            <span className="subtle">{itemsText(o)}</span>
            <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
              <span className="subtle">{relDay(o.createdAt, now)}</span>
              {o.isDraft && (
                <span className="bdg warning" style={{ fontSize: 11.5 }}>
                  مسودة
                </span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
