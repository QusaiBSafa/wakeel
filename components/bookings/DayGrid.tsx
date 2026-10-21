'use client';

import Avatar from '@/components/ui/Avatar';
import { BOOKING_STATUS } from '@/lib/constants';
import { clock } from '@/lib/format';
import type { BookingDTO, HoursDTO, MemberDTO } from '@/lib/types';
import { SCALE, ariaOf, durText, endMinOf, memberName, rangeText, startMinOf } from './shared';

/** Desktop / tablet: one column per staff member with the booking blocks positioned by time. */
export function DayGrid({ bookings, columns, hours, isToday, nowMin, selectedId, onOpen }: { bookings: BookingDTO[]; columns: MemberDTO[]; hours: HoursDTO | undefined; isToday: boolean; nowMin: number; selectedId: string | null; onOpen: (id: string) => void }) {
  const times = bookings.flatMap((b) => [startMinOf(b), endMinOf(b)]);
  const open0 = Math.floor(Math.min(hours?.openMin ?? 540, ...times) / 60) * 60;
  const end = Math.ceil(Math.max(hours?.closeMin ?? 1140, ...times) / 60) * 60;
  const height = Math.round((end - open0) * SCALE);
  const ticks: number[] = [];
  for (let m = open0; m <= end; m += 60) ticks.push(m);
  const top = (m: number) => Math.round((m - open0) * SCALE);
  return (
    <div className="card hide-m" style={{ overflow: 'hidden' }}>
      <div className="cal-wrap">
        <div className="cal" style={{ gridTemplateColumns: `72px repeat(${columns.length}, minmax(0, 1fr))` }}>
          <div className="cal-hd" style={{ background: '#FAFBF8' }} />
          {columns.map((c) => (
            <div key={c.id} className="cal-hd" style={{ borderInlineStart: '1px solid #E6E9F0' }}>
              <Avatar name={c.name} color={c.color} size="sm" />
              {c.name}
            </div>
          ))}
          <div className="cal-times" style={{ height }}>
            {ticks.map((m, i) => (
              <span key={m} className="cal-t num" style={{ top: top(m) + (i === 0 ? 8 : 0) }}>
                {clock(m)}
              </span>
            ))}
          </div>
          {columns.map((c) => (
            <div key={c.id} className="cal-col" style={{ height }}>
              {hours?.open && hours.breakStartMin !== null && hours.breakEndMin !== null && (
                <div className="blk" style={{ top: top(hours.breakStartMin), height: Math.round((hours.breakEndMin - hours.breakStartMin) * SCALE) }}>
                  استراحة
                </div>
              )}
              {hours?.open && hours.closeMin < end && (
                <div className="blk" style={{ top: top(hours.closeMin), height: Math.round((end - hours.closeMin) * SCALE) }}>
                  مغلق
                </div>
              )}
              {isToday && nowMin >= open0 && nowMin <= end && <div className="now" style={{ top: top(nowMin) }} aria-hidden="true" />}
              {bookings
                .filter((b) => b.memberId === c.id)
                .map((b) => {
                  const short = b.durationMin < 60;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className={`evt ${b.status}${short ? ' short' : ''}${b.id === selectedId ? ' sel' : ''}`}
                      style={{ top: top(startMinOf(b)), height: Math.max(30, Math.round(b.durationMin * SCALE) - 3) }}
                      onClick={() => onOpen(b.id)}
                      aria-label={ariaOf(b)}
                    >
                      <b className="trunc">{b.customerName}</b>
                      <span className="num trunc">{short ? `${clock(startMinOf(b))} · ${b.serviceName}` : rangeText(b)}</span>
                      {!short && <span className="trunc">{b.serviceName}</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Phones: the same day as an agenda list. */
export function DayAgenda({ bookings, members, onOpen }: { bookings: BookingDTO[]; members: MemberDTO[]; onOpen: (id: string) => void }) {
  return (
    <ul className="only-m col" style={{ gap: 10 }}>
      {bookings.map((b) => (
        <li key={b.id}>
          <button type="button" className={`wevt ${b.status}`} onClick={() => onOpen(b.id)} style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', minHeight: 64 }}>
            <span style={{ width: 62, flex: 'none' }}>
              <b className="num" style={{ display: 'block', fontSize: 15 }}>
                {clock(startMinOf(b))}
              </b>
              <span className="num" style={{ fontSize: 12 }}>
                {durText(b.durationMin)}
              </span>
            </span>
            <span className="grow">
              <b style={{ display: 'block' }}>{b.customerName}</b>
              <span>
                {b.serviceName} · {memberName(members, b.memberId)}
              </span>
            </span>
            <span className={BOOKING_STATUS[b.status].cls}>{BOOKING_STATUS[b.status].label}</span>
          </button>
        </li>
      ))}
      {bookings.length === 0 && (
        <li className="card empty" style={{ padding: 24 }}>
          <b>لا توجد مواعيد في هذا اليوم</b>
        </li>
      )}
    </ul>
  );
}
