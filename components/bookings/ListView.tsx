'use client';

import { BOOKING_STATUS } from '@/lib/constants';
import { clock } from '@/lib/format';
import type { BookingDTO, MemberDTO } from '@/lib/types';
import { durText, memberName, startMinOf } from './shared';

export type Group = { date: string; label: string; bookings: BookingDTO[] };

export default function ListView({ groups, members, onOpen }: { groups: Group[]; members: MemberDTO[]; onOpen: (id: string) => void }) {
  if (groups.length === 0)
    return (
      <div className="card empty">
        <b>لا توجد مواعيد قادمة</b>
        <p className="muted" style={{ fontSize: 14 }}>
          ستظهر هنا مواعيد الأيام السبعة القادمة.
        </p>
      </div>
    );
  return (
    <div className="col" style={{ gap: 16 }}>
      {groups.map((g) => (
        <section key={g.date} className="card" aria-label={g.label}>
          <div className="card-head">
            <h2>{g.label}</h2>
            <span className="subtle">{g.bookings.length} مواعيد</span>
          </div>
          <ul>
            {g.bookings.map((b) => (
              <li key={b.id} style={{ borderTop: '1px solid #E6E9F0' }}>
                <button type="button" onClick={() => onOpen(b.id)} style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center', padding: '12px 20px', background: 'none', border: 0, textAlign: 'start', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ width: 92, flex: 'none' }}>
                    <b className="num">{clock(startMinOf(b))}</b>
                    <span className="subtle num" style={{ display: 'block' }}>
                      {durText(b.durationMin)}
                    </span>
                  </span>
                  <span className="grow" style={{ flex: '1 1 200px' }}>
                    <b style={{ display: 'block' }}>{b.customerName}</b>
                    <span className="subtle">
                      {b.serviceName} · {memberName(members, b.memberId)} · <span className="ltr num">{b.customerPhone}</span>
                    </span>
                  </span>
                  <span className={BOOKING_STATUS[b.status].cls}>{BOOKING_STATUS[b.status].label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
