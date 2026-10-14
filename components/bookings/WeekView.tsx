'use client';

import { clock, DAYS, dayMonth } from '@/lib/format';
import type { BookingDTO, HoursDTO, MemberDTO } from '@/lib/types';
import { dateOf, memberName, startMinOf } from './shared';

export default function WeekView({ days, bookings, members, hours, today, onOpen }: { days: string[]; bookings: BookingDTO[]; members: MemberDTO[]; hours: HoursDTO[]; today: string; onOpen: (id: string) => void }) {
  return (
    <div className="week">
      {days.map((d, i) => {
        const closed = hours.find((h) => h.weekday === i)?.open === false;
        const evs = bookings.filter((b) => dateOf(b) === d).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        return (
          <section key={d} className={`wday${d === today ? ' today' : ''}${closed ? ' closed' : ''}`} aria-label={`${DAYS[i]} ${dayMonth(d)}`}>
            <div className="wday-h">
              <b>{DAYS[i]}</b>
              <span className="subtle num">{dayMonth(d).split(' ')[0]}</span>
            </div>
            <div className="col" style={{ padding: 8, gap: 6 }}>
              {evs.map((b) => (
                <button key={b.id} type="button" className={`wevt ${b.status}`} onClick={() => onOpen(b.id)}>
                  <b className="num">{clock(startMinOf(b))}</b> {b.customerName}
                  <span style={{ display: 'block', fontSize: 11.5 }}>
                    {b.serviceName} · {memberName(members, b.memberId)}
                  </span>
                </button>
              ))}
              {closed && (
                <span className="subtle" style={{ textAlign: 'center', padding: '16px 0' }}>
                  مغلق
                </span>
              )}
              {!closed && evs.length === 0 && (
                <span className="subtle" style={{ textAlign: 'center', padding: '16px 0' }}>
                  لا توجد حجوزات
                </span>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
