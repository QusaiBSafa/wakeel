'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Drawer from '@/components/ui/Drawer';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { BOOKING_STATUS } from '@/lib/constants';
import { PHONE_RE, clock, dateTitle, durText, formatMoney, telLink, waLink } from '@/lib/format';
import type { BookingsData } from '@/lib/server/loaders/bookings';
import type { BookingDTO, CatalogItemDTO } from '@/lib/types';
import SlotPicker, { type Pick } from './SlotPicker';
import { dateOf, endMinOf, memberName, startMinOf } from './shared';

export type DrawerMode = { kind: 'view' | 'resched'; id: string } | { kind: 'new' };

export default function BookingDrawer({
  mode,
  booking,
  data,
  nowMs,
  onMode,
  onClose,
  onUpsert,
  onCancel,
}: {
  mode: DrawerMode;
  booking: BookingDTO | null;
  data: BookingsData;
  nowMs: number;
  onMode: (m: DrawerMode) => void;
  onClose: () => void;
  onUpsert: (b: BookingDTO, focusDate?: string) => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const services: CatalogItemDTO[] = data.services.filter((s) => s.active);
  const isNew = mode.kind === 'new';
  const resched = mode.kind === 'resched';
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [svc, setSvc] = useState(services[0]?.id ?? '');
  const [pick, setPick] = useState<Pick>(() => ({ date: booking && resched ? (dateOf(booking) < data.today ? data.today : dateOf(booking)) : data.today, startMin: null, memberId: null }));
  const [nonce, setNonce] = useState(0);
  const [touched, setTouched] = useState(false);
  const [pickErr, setPickErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });

  const nameErr = touched && !name.trim();
  const phoneErr = touched && !PHONE_RE.test(phone.trim());
  const itemId = isNew ? svc : booking?.itemId ?? '';

  async function setStatus(to: 'confirmed' | 'done' | 'cancelled') {
    if (!booking) return;
    setBusy(true);
    try {
      const b = await api<BookingDTO>('POST', `/api/app/bookings/${booking.id}/status`, { to });
      onUpsert(b);
      toast(to === 'confirmed' ? `تم تأكيد الحجز وأُرسلت رسالة إلى ${b.customerName.split(' ')[0]}` : 'سُجّل الموعد كمكتمل');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (isNew && (!name.trim() || !PHONE_RE.test(phone.trim()))) {
      setTouched(true);
      setPickErr(pick.startMin === null);
      return;
    }
    if (pick.startMin === null) {
      setPickErr(true);
      return;
    }
    setBusy(true);
    try {
      const b = isNew
        ? await api<BookingDTO>('POST', '/api/app/bookings', { customer: name.trim(), phone: phone.trim(), itemId: svc, date: pick.date, startMin: pick.startMin })
        : await api<BookingDTO>('PATCH', `/api/app/bookings/${booking!.id}`, { date: pick.date, startMin: pick.startMin });
      onUpsert(b, pick.date);
      toast(isNew ? 'تم الحجز وأُرسلت رسالة تأكيد إلى العميل' : 'تم تغيير الموعد وأُرسل الموعد الجديد إلى العميل');
    } catch (e) {
      fail(e);
      // someone took the slot meanwhile: reload the slots and clear the choice
      setNonce((n) => n + 1);
      setPick((p) => ({ ...p, startMin: null }));
    } finally {
      setBusy(false);
    }
  }

  const view = mode.kind === 'view' && booking;
  const isPending = booking?.status === 'pending';
  const active = booking?.status === 'pending' || booking?.status === 'confirmed';
  const canComplete = booking?.status === 'confirmed' && new Date(booking.startsAt).getTime() <= nowMs;
  const when = booking ? `${dateTitle(dateOf(booking))} · ${clock(startMinOf(booking))} – ${clock(endMinOf(booking))}` : '';
  const title = isNew ? 'حجز جديد' : resched ? `تغيير موعد ${booking?.customerName ?? ''}` : booking?.customerName ?? '';
  const sub = isNew ? 'تظهر الأوقات المتاحة فقط' : booking ? `${booking.serviceName} · ${when}` : '';

  return (
    <Drawer
      open
      onClose={onClose}
      labelledBy="bd-h"
      head={
        <>
          <div className="grow">
            <h2 id="bd-h" style={{ fontSize: 19 }}>
              {title}
            </h2>
            <span className="subtle">{sub}</span>
          </div>
          <button type="button" className="ib" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </>
      }
      foot={
        view && booking ? (
          <>
            {isPending && (
              <button type="button" className="btn btn-primary" onClick={() => setStatus('confirmed')} disabled={busy} style={{ flex: '1 1 auto' }}>
                أكّد الحجز
              </button>
            )}
            {canComplete && (
              <button type="button" className="btn btn-primary" onClick={() => setStatus('done')} disabled={busy} style={{ flex: '1 1 auto' }}>
                تم الموعد
              </button>
            )}
            {active ? (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => onMode({ kind: 'resched', id: booking.id })}>
                  تغيير الموعد
                </button>
                <button type="button" className="btn btn-danger-soft" onClick={onCancel}>
                  إلغاء
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: '1 1 auto' }}>
                إغلاق
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={commit} disabled={busy} style={{ flex: '1 1 auto' }}>
              {busy && <span className="spin" />}
              {isNew ? 'تأكيد الحجز' : 'تأكيد الموعد الجديد'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => (isNew ? onClose() : onMode({ kind: 'view', id: booking!.id }))}>
              إلغاء
            </button>
          </>
        )
      }
    >
      <div data-clarity-mask="true" className="col" style={{ gap: 18 }}>
        {view && booking && (
          <>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className={BOOKING_STATUS[booking.status].cls}>{BOOKING_STATUS[booking.status].label}</span>
              <span className="bdg outline">{booking.source === 'ai' ? 'حجزه هُدهُد' : 'حجز يدوي'}</span>
            </div>
            <section className="card card-pad" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Avatar name={booking.customerName} size="lg" />
              <div className="grow">
                <b style={{ display: 'block' }}>{booking.customerName}</b>
                <a className="ltr num tap" href={telLink(booking.customerPhone)} style={{ fontSize: 14 }}>
                  {booking.customerPhone}
                </a>
              </div>
              <a className="btn btn-secondary btn-sm" href={waLink(booking.customerPhone)} target="_blank" rel="noopener">
                <WhatsAppIcon />
                تواصل عبر واتساب
              </a>
            </section>
            <dl className="card card-pad kv">
              <dt>الخدمة</dt>
              <dd>{booking.serviceName}</dd>
              <dt>الموعد</dt>
              <dd>{when}</dd>
              <dt>المدة</dt>
              <dd>{durText(booking.durationMin)}</dd>
              <dt>الموظف</dt>
              <dd>{memberName(data.members, booking.memberId) || '—'}</dd>
              <dt>السعر</dt>
              <dd className="num">{formatMoney(booking.priceMinor)}</dd>
            </dl>
            {isPending && (
              <div className="alert warning">
                <Icon name="info" />
                <div>حجز هُدهُد الموعد مبدئياً وينتظر موافقتك. عند تأكيده، سنرسل إلى العميل رسالة تأكيد.</div>
              </div>
            )}
          </>
        )}

        {!view && (
          <>
            {isNew && (
              <>
                <div className="field">
                  <label htmlFor="n-name">
                    اسم العميل <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input id="n-name" className={nameErr ? 'input bad' : 'input'} value={name} onChange={(e) => setName(e.target.value)} />
                  {nameErr && <span className="err">اكتب الاسم</span>}
                </div>
                <div className="field">
                  <label htmlFor="n-phone">
                    رقم واتساب <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input id="n-phone" className={phoneErr ? 'input bad' : 'input'} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+970 59 123 4567" />
                  {phoneErr && <span className="err">الرقم غير صحيح</span>}
                </div>
                <div className="field">
                  <label htmlFor="n-svc">الخدمة</label>
                  <select
                    id="n-svc"
                    className="input"
                    value={svc}
                    onChange={(e) => {
                      setSvc(e.target.value);
                      setPick((p) => ({ ...p, startMin: null }));
                    }}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {durText(s.durationMin ?? 60)} · {formatMoney(s.priceMinor)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {resched && booking && (
              <div className="alert info">
                <Icon name="calendar" />
                <div>
                  الموعد الحالي: <b>{when}</b>. اختر وقتاً جديداً. الأوقات المحجوزة غير متاحة لتجنّب حجزين في الوقت نفسه.
                </div>
              </div>
            )}
            {itemId ? (
              <SlotPicker
                itemId={itemId}
                excludeId={resched ? booking!.id : undefined}
                today={data.today}
                hours={data.hours}
                closures={data.closures.map((c) => c.date)}
                horizonDays={data.rules.horizonDays}
                value={pick}
                nonce={nonce}
                onChange={(p) => {
                  setPick(p);
                  setPickErr(false);
                }}
                memberName={(id) => memberName(data.members, id)}
              />
            ) : (
              <div className="alert warning">
                <div>أضف خدمة من صفحة المنتجات والخدمات لتتمكن من إنشاء حجز.</div>
              </div>
            )}
            {pickErr && <span className="err">اختر وقتاً أولاً</span>}
          </>
        )}
      </div>
    </Drawer>
  );
}
