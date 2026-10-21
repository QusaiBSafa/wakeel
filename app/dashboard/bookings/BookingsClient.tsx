'use client';

import { useEffect, useMemo, useState } from 'react';
import AvailabilitySettings from '@/components/bookings/AvailabilitySettings';
import BookingDrawer, { type DrawerMode } from '@/components/bookings/BookingDrawer';
import { DayAgenda, DayGrid } from '@/components/bookings/DayGrid';
import ListView, { type Group } from '@/components/bookings/ListView';
import WeekView from '@/components/bookings/WeekView';
import { dateOf, startMinOf } from '@/components/bookings/shared';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import Seg from '@/components/ui/Seg';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { clock, dateTitle } from '@/lib/format';
import { addDays, minutesOf, weekdayOf } from '@/lib/time';
import type { BookingsData } from '@/lib/server/loaders/bookings';
import type { BookingDTO } from '@/lib/types';

type Tab = 'cal' | 'set';
type Mode = 'day' | 'week' | 'list';
type Range = { from: string; to: string };

const covered = (ranges: Range[], d: string) => ranges.some((r) => r.from <= d && d <= r.to);

const LEGEND: [string, React.CSSProperties][] = [
  ['مؤكد', { background: '#E6F5EC', border: '1px solid #A9DABF' }],
  ['بانتظار التأكيد', { background: '#FFF4E2', border: '1px dashed #F3C886' }],
  ['مكتمل', { background: '#EEF0F3', border: '1px solid #DADEE6' }],
  ['ملغي', { background: '#fff', border: '1px solid #F8B4AD' }],
  ['استراحة أو مغلق', { background: 'repeating-linear-gradient(135deg,#F1F3EE 0 3px,#E0E4DC 3px 6px)' }],
];

export default function BookingsClient({ data, initialTab, initialId }: { data: BookingsData; initialTab: Tab; initialId: string | null }) {
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [bookings, setBookings] = useState<BookingDTO[]>(data.bookings);
  const [ranges, setRanges] = useState<Range[]>([data.range]);
  if (src !== data) {
    setSrc(data);
    setBookings(data.bookings);
    setRanges([data.range]);
  }
  const [date, setDate] = useState(data.today);
  const [mode, setMode] = useState<Mode>('day');
  const [staff, setStaff] = useState('all');
  const [drawer, setDrawer] = useState<DrawerMode | null>(initialId ? { kind: 'view', id: initialId } : null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [nowMs, setNowMs] = useState(() => new Date(data.now).getTime());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const bookable = useMemo(() => data.members.filter((m) => data.bookableIds.includes(m.id)), [data.members, data.bookableIds]);
  const columns = staff === 'all' ? bookable : bookable.filter((m) => m.id === staff);
  const colIds = new Set(columns.map((m) => m.id));
  const visible = bookings.filter((b) => (staff === 'all' ? true : b.memberId === staff));
  const merge = (list: BookingDTO[]) =>
    setBookings((cur) => {
      const m = new Map(cur.map((b) => [b.id, b]));
      for (const b of list) m.set(b.id, b);
      return [...m.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    });

  /** Load a window (≤ 31 days) around `d` when it is not loaded yet. */
  async function ensure(d: string) {
    const weekStart = addDays(d, -weekdayOf(d));
    const need = [weekStart, addDays(weekStart, 6)];
    if (covered(ranges, need[0]) && covered(ranges, need[1])) return;
    const r = { from: addDays(weekStart, -7), to: addDays(weekStart, 13) };
    try {
      const res = await api<{ bookings: BookingDTO[] }>('GET', `/api/app/bookings?from=${r.from}&to=${r.to}`);
      merge(res.bookings);
      setRanges((x) => [...x, r]);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }

  const go = (d: string) => {
    setDate(d);
    void ensure(d);
  };

  // ?id= opens a booking that may be outside the loaded window
  useEffect(() => {
    if (!initialId || bookings.some((b) => b.id === initialId)) return;
    api<BookingDTO>('GET', `/api/app/bookings/${initialId}`)
      .then((b) => {
        merge([b]);
        setDate(dateOf(b));
        return ensure(dateOf(b));
      })
      .catch((e) => {
        setDrawer(null);
        toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
      });
    // run once for the deep link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = bookings.find((b) => drawer && 'id' in drawer && b.id === drawer.id) ?? null;
  const dayHours = data.hours.find((h) => h.weekday === weekdayOf(date));
  const dayBookings = visible.filter((b) => dateOf(b) === date && (b.memberId === null || colIds.has(b.memberId))).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const weekStart = addDays(date, -weekdayOf(date));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = data.today;
  const nowMin = minutesOf(new Date(nowMs));

  const groups: Group[] = Array.from({ length: 7 }, (_, i) => addDays(todayStr, i))
    .map((d) => ({
      date: d,
      label: (d === todayStr ? 'اليوم · ' : d === addDays(todayStr, 1) ? 'غداً · ' : '') + dateTitle(d),
      bookings: visible.filter((b) => dateOf(b) === d && b.status !== 'cancelled' && new Date(b.endsAt).getTime() > nowMs).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    }))
    .filter((g) => g.bookings.length > 0);

  const title = mode === 'day' ? dateTitle(date) + (date === todayStr ? ' · اليوم' : '') : mode === 'week' ? `أسبوع ${weekDays[0].slice(8).replace(/^0/, '')} – ${weekDays[6].slice(8).replace(/^0/, '')}` : 'المواعيد القادمة';

  async function cancelBooking() {
    if (!open) return;
    try {
      const b = await api<BookingDTO>('POST', `/api/app/bookings/${open.id}/status`, { to: 'cancelled' });
      merge([b]);
      setCancelOpen(false);
      toast('أُلغي الحجز وأُرسل إشعار إلى العميل');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  return (
    <main className="page" id="main" data-clarity-mask="true">
      <div className="page-head">
        <div className="t">
          <h1>الحجوزات</h1>
          <p>مواعيد اليوم والأسبوع، وأوقات العمل التي يحجز فيها هُدهُد.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDrawer({ kind: 'new' })}>
          <Icon name="plus" />
          حجز جديد
        </button>
      </div>

      <Tabs
        label="أقسام الحجوزات"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'cal', label: 'التقويم' },
          { value: 'set', label: 'أوقات العمل والتوفّر' },
        ]}
      />

      {tab === 'set' && <AvailabilitySettings data={data} />}

      {tab === 'cal' && (
        <>
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button type="button" className="ib bd" onClick={() => go(addDays(date, mode === 'week' ? -7 : -1))} aria-label={mode === 'week' ? 'الأسبوع السابق' : 'اليوم السابق'}>
                <Icon name="back" />
              </button>
              <button type="button" className="ib bd" onClick={() => go(addDays(date, mode === 'week' ? 7 : 1))} aria-label={mode === 'week' ? 'الأسبوع التالي' : 'اليوم التالي'}>
                <Icon name="next" />
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(todayStr)}>
                اليوم
              </button>
              <h2 style={{ fontSize: 18, marginInlineStart: 6 }} aria-live="polite">
                {title}
              </h2>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <Seg
                label="طريقة العرض"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'day', label: 'يوم' },
                  { value: 'week', label: 'أسبوع' },
                  { value: 'list', label: 'قائمة' },
                ]}
              />
              <label className="sr-only" htmlFor="stf">
                الموظف
              </label>
              <select id="stf" className="input" style={{ width: 'auto', minWidth: 140 }} value={staff} onChange={(e) => setStaff(e.target.value)}>
                <option value="all">كل الموظفين</option>
                {bookable.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ gap: 14, flexWrap: 'wrap', fontSize: 13 }} aria-label="مفتاح الألوان">
            {LEGEND.map(([label, st]) => (
              <span key={label} className="row" style={{ gap: 6 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, ...st }} />
                {label}
              </span>
            ))}
          </div>

          {loadError && <ErrorLine onRetry={() => ensure(date)} />}

          {bookings.length === 0 ? (
            <EmptyState icon="calendar" tone="accent" title="لا توجد حجوزات بعد" text="حدّد أوقات عملك وخدماتك، ليبدأ هُدهُد بعرض المواعيد المتاحة وحجزها للعملاء.">
              <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setTab('set')}>
                  إعداد أوقات العمل
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDrawer({ kind: 'new' })}>
                  أضف حجز
                </button>
              </div>
            </EmptyState>
          ) : (
            <>
              {mode === 'day' &&
                (dayHours && !dayHours.open ? (
                  <div className="card empty">
                    <b>المركز مغلق في هذا اليوم</b>
                    <p className="muted" style={{ fontSize: 14 }}>
                      {dateTitle(date).split(' ')[0]} يوم عطلة حسب أوقات العمل، ولا يعرض هُدهُد مواعيد فيه.
                    </p>
                  </div>
                ) : (
                  <>
                    <DayGrid bookings={dayBookings} columns={columns} hours={dayHours} isToday={date === todayStr} nowMin={nowMin} selectedId={open?.id ?? null} onOpen={(id) => setDrawer({ kind: 'view', id })} />
                    <DayAgenda bookings={dayBookings} members={data.members} onOpen={(id) => setDrawer({ kind: 'view', id })} />
                  </>
                ))}
              {mode === 'week' && <WeekView days={weekDays} bookings={visible} members={data.members} hours={data.hours} today={todayStr} onOpen={(id) => setDrawer({ kind: 'view', id })} />}
              {mode === 'list' && <ListView groups={groups} members={data.members} onOpen={(id) => setDrawer({ kind: 'view', id })} />}
            </>
          )}
        </>
      )}

      {drawer && (drawer.kind === 'new' || open) && (
        <BookingDrawer
          key={drawer.kind === 'new' ? 'new' : `${drawer.kind}-${drawer.id}`}
          mode={drawer}
          booking={open}
          data={data}
          nowMs={nowMs}
          onMode={setDrawer}
          onClose={() => setDrawer(null)}
          onUpsert={(b, focusDate) => {
            merge([b]);
            if (focusDate) go(focusDate);
            setDrawer({ kind: 'view', id: b.id });
          }}
          onCancel={() => setCancelOpen(true)}
        />
      )}

      <Dialog
        open={cancelOpen && !!open}
        onClose={() => setCancelOpen(false)}
        labelledBy="bc-h"
        role="alertdialog"
        body={
          <>
            <h2 id="bc-h">هل تريد إلغاء حجز {open?.customerName}؟</h2>
            <p className="muted">
              {open ? `${dateTitle(dateOf(open))} · ${clock(startMinOf(open))} · ${open.serviceName}` : ''}. سنرسل للعميل رسالة بإلغاء الموعد، ويصبح الوقت متاحاً ليحجزه هُدهُد.
            </p>
          </>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)}>
              لا، تراجع
            </button>
            <button type="button" className="btn btn-danger" onClick={cancelBooking}>
              ألغِ الحجز
            </button>
          </>
        }
      />
    </main>
  );
}

function ErrorLine({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="alert danger" role="alert" style={{ alignItems: 'center' }}>
      <span className="grow">تعذّر تحميل حجوزات هذه الفترة.</span>
      <button type="button" className="btn btn-danger btn-sm" onClick={onRetry}>
        أعد المحاولة
      </button>
    </div>
  );
}
