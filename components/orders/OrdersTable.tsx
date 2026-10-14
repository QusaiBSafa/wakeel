'use client';

import Logo from '@/components/ui/Logo';
import { ORDER_STATUS } from '@/lib/constants';
import { formatMoney, relDay } from '@/lib/format';
import type { OrderDTO } from '@/lib/types';

export function feeText(o: OrderDTO, areaFeeMinor: number | undefined): string {
  if (o.pickup) return 'استلام من المحل';
  if (o.deliveryFeeMinor === 0) return (areaFeeMinor ?? 0) > 0 ? 'توصيل مجاني' : '';
  return `شامل التوصيل ${formatMoney(o.deliveryFeeMinor)}`;
}
export const itemsText = (o: OrderDTO) => o.items.map((i) => `${i.name} ×${i.qty}`).join('، ');

export default function OrdersTable({ orders, now, areaFees, selectedId, onOpen }: { orders: OrderDTO[]; now: number; areaFees: Map<string, number>; selectedId: string | null; onOpen: (id: string) => void }) {
  return (
    <div className="card hide-m">
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">الطلب</th>
              <th scope="col">العميل</th>
              <th scope="col">التاريخ</th>
              <th scope="col">المنتجات</th>
              <th scope="col">الإجمالي</th>
              <th scope="col">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className={o.id === selectedId ? 'sel' : undefined} onClick={() => onOpen(o.id)}>
                <td>
                  <button
                    type="button"
                    className="btn-link ltr num"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(o.id);
                    }}
                    aria-label={`افتح الطلب ${o.number}`}
                  >
                    #{o.number}
                  </button>
                  <div className="subtle" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {o.source === 'ai' && <Logo size={10} />}
                    {o.source === 'ai' ? 'من هُدهُد' : 'يدوي'}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                  <div className="subtle ltr num" style={{ textAlign: 'right' }}>
                    {o.customerPhone}
                  </div>
                </td>
                <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {relDay(o.createdAt, now)}
                </td>
                <td className="muted" style={{ maxWidth: 260 }}>
                  {itemsText(o)}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <b className="num">{formatMoney(o.totalMinor)}</b>
                  <div className="subtle">{feeText(o, o.areaId ? areaFees.get(o.areaId) : undefined)}</div>
                </td>
                <td>
                  <div className="col" style={{ gap: 4, alignItems: 'flex-start' }}>
                    <span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span>
                    {o.isDraft && (
                      <span className="bdg warning" style={{ fontSize: 11.5 }}>
                        مسودة · بانتظار تأكيد العميل
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
