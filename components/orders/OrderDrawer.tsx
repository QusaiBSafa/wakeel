'use client';

import { useState } from 'react';
import { useShell } from '@/components/shell/ShellContext';
import Avatar from '@/components/ui/Avatar';
import Drawer from '@/components/ui/Drawer';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { CANCEL_REASONS, NEXT_LABEL, ORDER_STATUS, TL_IC, type CancelReason } from '@/lib/constants';
import { PHONE_RE, formatMoney, relDay, telLink, waLink } from '@/lib/format';
import { calcTotals } from '@/lib/orders';
import type { OrdersData } from '@/lib/server/loaders/orders';
import type { OrderDTO } from '@/lib/types';
import CancelDialog from './CancelDialog';

type Line = { itemId: string | null; variant: string | null; name: string; unitPriceMinor: number; qty: number };
type Edit = { customer: string; phone: string; lines: Line[]; area: string; address: string; notes: string };

function lineKey(l: Line) {
  return `${l.itemId}|${l.variant ?? ''}`;
}

function editOf(o: OrderDTO | null, data: OrdersData): Edit {
  if (!o) {
    const p = data.products[0];
    return { customer: '', phone: '', lines: p ? [{ itemId: p.id, variant: null, name: p.name, unitPriceMinor: p.priceMinor, qty: 1 }] : [], area: data.areas[0]?.id ?? 'pickup', address: '', notes: '' };
  }
  return {
    customer: o.customerName,
    phone: o.customerPhone,
    lines: o.items.map((i) => {
      // recover the chosen variant from the snapshot name «المنتج · النوع»
      const p = data.products.find((x) => x.id === i.itemId);
      const v = p?.variants.find((x) => `${p.name} · ${x.name}` === i.name);
      return { itemId: i.itemId, variant: v?.name ?? null, name: i.name, unitPriceMinor: i.unitPriceMinor, qty: i.qty };
    }),
    area: o.pickup ? 'pickup' : o.areaId ?? data.areas[0]?.id ?? 'pickup',
    address: o.address,
    notes: o.notes,
  };
}

export default function OrderDrawer({ order, data, onClose, onSaved }: { order: OrderDTO | null; data: OrdersData; onClose: () => void; onSaved: (o: OrderDTO, isNew: boolean) => void }) {
  const toast = useToast();
  const shell = useShell();
  const isNew = !order;
  const now = new Date(data.now).getTime();
  const [editing, setEditing] = useState(isNew);
  const [e, setE] = useState<Edit>(() => editOf(order, data));
  const [addSel, setAddSel] = useState(data.products[0] ? `${data.products[0].id}|` : '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const set = (p: Partial<Edit>) => setE((x) => ({ ...x, ...p }));
  const fail = (err: unknown) => toast(err instanceof ApiError ? err.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });

  const final = order?.status === 'delivered' || order?.status === 'cancelled';
  const pickup = e.area === 'pickup';
  const area = data.areas.find((a) => a.id === e.area) ?? null;
  const src = editing || !order ? e : editOf(order, data);
  const totals = editing || !order ? calcTotals(e.lines, pickup ? null : area, pickup, data.freeOverMinor) : { subtotal: order.subtotalMinor, fee: order.deliveryFeeMinor, total: order.totalMinor, free: !order.pickup && order.deliveryFeeMinor === 0 && (data.areas.find((a) => a.id === order.areaId)?.feeMinor ?? 0) > 0 };

  const nameErr = touched && editing && !e.customer.trim();
  const phoneErr = touched && editing && !PHONE_RE.test(e.phone.trim());
  const addrErr = touched && editing && !pickup && !e.address.trim();
  const orphan = e.lines.some((l) => !l.itemId);

  async function save() {
    if (!e.customer.trim() || !PHONE_RE.test(e.phone.trim()) || (!pickup && !e.address.trim()) || e.lines.length === 0) {
      setTouched(true);
      return;
    }
    if (orphan) {
      toast('أزل المنتجات المحذوفة من الطلب قبل الحفظ', { kind: 'bad' });
      return;
    }
    const body = {
      customer: e.customer.trim(),
      phone: e.phone.trim(),
      lines: e.lines.map((l) => ({ itemId: l.itemId, ...(l.variant ? { variant: l.variant } : {}), qty: l.qty })),
      pickup,
      areaId: pickup ? null : e.area,
      address: pickup ? '' : e.address.trim(),
      notes: e.notes.trim(),
    };
    setBusy(true);
    try {
      const saved = isNew ? await api<OrderDTO>('POST', '/api/app/orders', body) : await api<OrderDTO>('PATCH', `/api/app/orders/${order.id}`, body);
      onSaved(saved, isNew);
      toast(isNew ? `تمت إضافة الطلب #${saved.number}` : 'تم حفظ التعديلات');
      setEditing(false);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function advance() {
    if (!order) return;
    setBusy(true);
    try {
      const o = await api<OrderDTO>('POST', `/api/app/orders/${order.id}/advance`);
      onSaved(o, false);
      toast(`حالة الطلب الآن: ${ORDER_STATUS[o.status].label}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(reason: CancelReason) {
    if (!order) return;
    try {
      const o = await api<OrderDTO>('POST', `/api/app/orders/${order.id}/cancel`, { reason });
      onSaved(o, false);
      setCancelOpen(false);
      toast('أُلغي الطلب وأُرسل إشعار إلى العميل');
    } catch (err) {
      fail(err);
    }
  }

  const addLine = () => {
    const [id, variant] = addSel.split('|');
    const p = data.products.find((x) => x.id === id);
    if (!p) return;
    const v = variant ? p.variants.find((x) => x.name === variant) : undefined;
    const line: Line = { itemId: p.id, variant: v?.name ?? null, name: v ? `${p.name} · ${v.name}` : p.name, unitPriceMinor: v ? v.priceMinor : p.priceMinor, qty: 1 };
    const ex = e.lines.find((l) => lineKey(l) === lineKey(line));
    set({ lines: ex ? e.lines.map((l) => (l === ex ? { ...l, qty: Math.min(99, l.qty + 1) } : l)) : [...e.lines, line] });
  };
  const upd = (i: number, qty: number) => set({ lines: e.lines.map((l, k) => (k === i ? { ...l, qty: Math.max(1, Math.min(99, qty)) } : l)) });

  const hasNext = !!order && !final && !!NEXT_LABEL[order.status];
  const title = order ? `#${order.number}` : 'طلب جديد';
  const meta = !order ? 'تضيفه بنفسك' : `${order.source === 'ai' ? 'سجّله هُدهُد من واتساب' : `أضافه ${shell.owner.name}`} · ${relDay(order.createdAt, now)}`;
  const reasonText = order?.cancelReason ? CANCEL_REASONS.find((r) => r.k === order.cancelReason)?.text : '';

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        labelledBy="od-h"
        head={
          <>
            <div className="grow">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <h2 id="od-h" className="ltr num" style={{ fontSize: 20 }}>
                  {title}
                </h2>
                <span className={ORDER_STATUS[order?.status ?? 'new'].cls}>{ORDER_STATUS[order?.status ?? 'new'].label}</span>
                {order?.isDraft && <span className="bdg warning">مسودة · بانتظار تأكيد العميل</span>}
              </div>
              <span className="subtle">{meta}</span>
            </div>
            <button type="button" className="ib" onClick={onClose} aria-label="إغلاق">
              <Icon name="close" />
            </button>
          </>
        }
        foot={
          editing ? (
            <>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy} style={{ flex: '1 1 auto' }}>
                {busy && <span className="spin" />}
                {isNew ? 'احفظ الطلب' : 'احفظ التعديلات'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => (isNew ? onClose() : (setE(editOf(order, data)), setEditing(false), setTouched(false)))}>
                إلغاء
              </button>
            </>
          ) : (
            <>
              {hasNext && (
                <button type="button" className="btn btn-primary" onClick={advance} disabled={busy} style={{ flex: '1 1 auto' }}>
                  {NEXT_LABEL[order!.status]}
                </button>
              )}
              {!final && (
                <button type="button" className="btn btn-danger-soft" onClick={() => setCancelOpen(true)}>
                  إلغاء الطلب
                </button>
              )}
              {final && (
                <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: '1 1 auto' }}>
                  إغلاق
                </button>
              )}
            </>
          )
        }
      >
        <div className="col" style={{ gap: 18 }} data-clarity-mask="true">
          {order?.status === 'delivered' && (
            <div className="alert success">
              <Icon name="check" />
              <div>
                <b>اكتمل الطلب.</b> سُلِّم للعميل {order.deliveredAt ? relDay(order.deliveredAt, now) : 'الآن'}.
              </div>
            </div>
          )}
          {order?.status === 'cancelled' && (
            <div className="alert danger">
              <Icon name="close" />
              <div>
                <b>الطلب ملغي.</b> {reasonText}
              </div>
            </div>
          )}
          {order?.isDraft && (
            <div className="alert warning">
              <Icon name="info" />
              <div>جهّز هُدهُد الطلب وينتظر تأكيد العميل للعنوان. إذا أكّدته بنفسك، فسنرسل له رسالة تأكيد عبر واتساب.</div>
            </div>
          )}

          {editing ? (
            <section className="card card-pad col" style={{ gap: 12 }} aria-label="العميل">
              <div className="field">
                <label htmlFor="e-name">
                  اسم العميل <span className="req" aria-hidden="true">*</span>
                </label>
                <input id="e-name" className={nameErr ? 'input bad' : 'input'} value={e.customer} onChange={(x) => set({ customer: x.target.value })} autoComplete="name" />
                {nameErr && <span className="err">اكتب اسم العميل</span>}
              </div>
              <div className="field">
                <label htmlFor="e-phone">
                  رقم واتساب <span className="req" aria-hidden="true">*</span>
                </label>
                <input id="e-phone" className={phoneErr ? 'input bad' : 'input'} type="tel" inputMode="tel" value={e.phone} onChange={(x) => set({ phone: x.target.value })} placeholder="+970 59 123 4567" />
                {phoneErr && <span className="err">الرقم غير صحيح، اكتبه مع رمز الدولة</span>}
              </div>
            </section>
          ) : (
            order && (
              <section className="card card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar name={order.customerName} />
                <div className="grow">
                  <b style={{ display: 'block' }}>{order.customerName}</b>
                  <a className="ltr num tap" href={telLink(order.customerPhone)} style={{ fontSize: 14 }}>
                    {order.customerPhone}
                  </a>
                </div>
                <a className="btn btn-secondary btn-sm" href={waLink(order.customerPhone)} target="_blank" rel="noopener">
                  <WhatsAppIcon />
                  تواصل عبر واتساب
                </a>
              </section>
            )
          )}

          <section className="col" style={{ gap: 10 }} aria-labelledby="it-h">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 id="it-h">المنتجات</h3>
              {!editing && !final && order && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                  <Icon name="edit" size="sm" />
                  تعديل الطلب
                </button>
              )}
            </div>
            <ul className="card" style={{ padding: '4px 0' }}>
              {(editing ? e.lines : src.lines).map((l, i) => (
                <li key={`${lineKey(l)}${i}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #E6E9F0' }}>
                  <div className="grow">
                    <b style={{ display: 'block', fontSize: 14.5 }}>{l.name}</b>
                    <span className="subtle num">{formatMoney(l.unitPriceMinor)} للقطعة</span>
                  </div>
                  {editing ? (
                    <>
                      <div className="seg" role="group" aria-label={`كمية ${l.name}`}>
                        <button type="button" onClick={() => upd(i, l.qty - 1)} aria-label="إنقاص">
                          −
                        </button>
                        <span className="num" style={{ minWidth: 28, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                          {l.qty}
                        </span>
                        <button type="button" onClick={() => upd(i, l.qty + 1)} aria-label="زيادة">
                          +
                        </button>
                      </div>
                      <button type="button" className="ib sm danger" onClick={() => set({ lines: e.lines.filter((_, k) => k !== i) })} aria-label={`إزالة ${l.name}`}>
                        <Icon name="trash" size="sm" />
                      </button>
                    </>
                  ) : (
                    <span className="subtle num">×{l.qty}</span>
                  )}
                  <b className="num" style={{ minWidth: 64, textAlign: 'left' }}>
                    {formatMoney(l.unitPriceMinor * l.qty)}
                  </b>
                </li>
              ))}
              {editing && e.lines.length === 0 && (
                <li className="err" style={{ padding: '12px 14px' }}>
                  يجب أن يحتوي الطلب على منتج واحد على الأقل
                </li>
              )}
            </ul>
            {editing && (
              <div className="row" style={{ gap: 8 }}>
                <label htmlFor="add-p" className="sr-only">
                  أضف منتج
                </label>
                <select id="add-p" className="input" value={addSel} onChange={(x) => setAddSel(x.target.value)}>
                  {data.products.flatMap((p) => [
                    <option key={p.id} value={`${p.id}|`}>
                      {p.name} · {formatMoney(p.priceMinor)}
                    </option>,
                    ...p.variants.map((v) => (
                      <option key={`${p.id}${v.name}`} value={`${p.id}|${v.name}`}>
                        {p.name} · {v.name} · {formatMoney(v.priceMinor)}
                      </option>
                    )),
                  ])}
                </select>
                <button type="button" className="btn btn-soft" onClick={addLine} disabled={data.products.length === 0}>
                  أضف
                </button>
              </div>
            )}
            <dl className="card card-pad" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, fontSize: 14 }}>
              <dt className="muted">المجموع</dt>
              <dd className="num">{formatMoney(totals.subtotal)}</dd>
              <dt className="muted">التوصيل ({editing ? (pickup ? 'استلام من المحل' : area?.name ?? '') : order?.pickup ? 'استلام من المحل' : order?.areaName})</dt>
              <dd className="num">{totals.free ? `مجاني (للطلبات فوق ${formatMoney(data.freeOverMinor ?? 0)})` : formatMoney(totals.fee)}</dd>
              <dt style={{ fontWeight: 700, borderTop: '1px solid #E6E9F0', paddingTop: 8 }}>الإجمالي</dt>
              <dd className="num" style={{ fontWeight: 800, fontSize: 17, borderTop: '1px solid #E6E9F0', paddingTop: 8 }}>
                {formatMoney(totals.total)}
              </dd>
            </dl>
          </section>

          <section className="col" style={{ gap: 10 }} aria-labelledby="dl-h">
            <h3 id="dl-h">التوصيل</h3>
            {!editing && order ? (
              <dl className="card card-pad kv">
                <dt>المنطقة</dt>
                <dd>{order.pickup ? 'استلام من المحل' : order.areaName || '—'}</dd>
                <dt>العنوان</dt>
                <dd>{order.pickup ? 'استلام من المحل' : order.address || '—'}</dd>
                <dt>ملاحظات</dt>
                <dd>{order.notes || 'لا يوجد'}</dd>
              </dl>
            ) : (
              <div className="card card-pad col" style={{ gap: 12 }}>
                <div className="field">
                  <label htmlFor="e-area">منطقة التوصيل</label>
                  <select id="e-area" className="input" value={e.area} onChange={(x) => set({ area: x.target.value })}>
                    {data.areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.feeMinor ? ` · ${formatMoney(a.feeMinor)}` : ' · مجاناً'}
                      </option>
                    ))}
                    <option value="pickup">استلام من المحل · مجاناً</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="e-addr">
                    العنوان {!pickup && <span className="req" aria-hidden="true">*</span>}
                  </label>
                  <textarea id="e-addr" className={addrErr ? 'input bad' : 'input'} value={e.address} onChange={(x) => set({ address: x.target.value })} placeholder="المدينة، الحي، أقرب معلم" disabled={pickup} />
                  {addrErr && <span className="err">اكتب العنوان ليصل الطلب</span>}
                </div>
                <div className="field">
                  <label htmlFor="e-notes">
                    ملاحظات <span className="opt">(اختياري)</span>
                  </label>
                  <input id="e-notes" className="input" value={e.notes} onChange={(x) => set({ notes: x.target.value })} placeholder="مثلاً: اتصل قبل الوصول" />
                </div>
              </div>
            )}
          </section>

          <section className="col" style={{ gap: 10 }} aria-labelledby="tl-h">
            <h3 id="tl-h">سجل الطلب</h3>
            <ol className="card card-pad col" style={{ gap: 14 }}>
              {(order?.events ?? [{ id: 'n', kind: 'owner', text: `${shell.owner.name} تضيف الطلب`, actorName: shell.owner.name, createdAt: data.now }]).map((ev) => {
                const ic = TL_IC[ev.kind] ?? TL_IC.owner;
                return (
                  <li key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span className={ic.cls} style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: 'none' }}>
                      <svg className="i i-sm" viewBox="0 0 24 24" aria-hidden="true">
                        <path d={ic.icon} />
                      </svg>
                    </span>
                    <div className="grow">
                      <b style={{ display: 'block', fontSize: 14 }}>{ev.text}</b>
                      <span className="subtle">
                        {ev.actorName} · {relDay(ev.createdAt, now)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </Drawer>
      {cancelOpen && order && <CancelDialog number={order.number} onClose={() => setCancelOpen(false)} onConfirm={cancel} />}
    </>
  );
}
