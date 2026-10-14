'use client';

import { useEffect, useState } from 'react';
import { clock, DAYS } from '@/lib/format';
import { api } from '@/lib/client/api';
import { addDays, weekdayOf } from '@/lib/time';
import type { HoursDTO } from '@/lib/types';

export type Pick = { date: string; startMin: number | null; memberId: string | null };
type SlotsRes = { memberId: string; memberName: string; durationMin: number; slots: { startMin: number; reason: string; memberId: string }[] };

/** Day chips for the next 7 days plus the slot grid for the chosen service. Disabled slots carry the reason. */
export default function SlotPicker({
  itemId,
  excludeId,
  today,
  hours,
  closures,
  horizonDays,
  value,
  nonce,
  onChange,
  memberName,
}: {
  itemId: string;
  excludeId?: string;
  today: string;
  hours: HoursDTO[];
  closures: string[];
  horizonDays: number;
  value: Pick;
  nonce: number;
  onChange: (p: Pick) => void;
  memberName: (id: string | null) => string;
}) {
  const key = `${itemId}|${value.date}|${excludeId ?? ''}|${nonce}`;
  const [res, setRes] = useState<{ key: string; data: SlotsRes | null } | null>(null);

  useEffect(() => {
    let live = true;
    const qs = new URLSearchParams({ itemId, date: value.date, ...(excludeId ? { excludeId } : {}) });
    api<SlotsRes>('GET', `/api/app/bookings/slots?${qs}`)
      .then((d) => live && setRes({ key, data: d }))
      .catch(() => live && setRes({ key, data: null }));
    return () => {
      live = false;
    };
  }, [key, itemId, value.date, excludeId]);

  const loading = res?.key !== key;
  const data = loading ? null : res!.data;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const closedDay = (d: string) => hours.find((h) => h.weekday === weekdayOf(d))?.open === false || closures.includes(d) || d > addDays(today, horizonDays);
  const chosen = data?.slots.find((s) => s.startMin === value.startMin);
  const dur = data?.durationMin ?? 0;
  const free = data ? data.slots.some((s) => !s.reason) : true;

  return (
    <>
      <div className="field">
        <span className="lbl">اليوم</span>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="radiogroup" aria-label="اختر اليوم">
          {days.map((d, i) => (
            <button key={d} type="button" className={value.date === d ? 'chip on' : 'chip'} role="radio" aria-checked={value.date === d} disabled={closedDay(d)} onClick={() => onChange({ date: d, startMin: null, memberId: null })}>
              {i === 0 ? 'اليوم' : i === 1 ? 'غداً' : DAYS[weekdayOf(d)]} {Number(d.slice(8))}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="lbl">
          الوقت{data ? ` مع ${data.memberName}` : ''}
          {dur ? ` (${dur} د)` : ''}
        </span>
        {loading ? (
          <div className="row" style={{ gap: 10 }} aria-live="polite">
            <span className="spin dk" />
            <span className="subtle">جارٍ تحميل الأوقات…</span>
          </div>
        ) : (
          <div className="slots" role="radiogroup" aria-label="الأوقات">
            {data?.slots.map((s) => (
              <button
                key={s.startMin}
                type="button"
                className={value.startMin === s.startMin ? 'slot-btn on' : 'slot-btn'}
                role="radio"
                aria-checked={value.startMin === s.startMin}
                disabled={!!s.reason}
                title={s.reason}
                aria-label={`${clock(s.startMin)}${s.reason ? `، ${s.reason}` : '، متاح'}`}
                onClick={() => onChange({ date: value.date, startMin: s.startMin, memberId: s.memberId })}
              >
                <span className="num">{clock(s.startMin)}</span>
              </button>
            ))}
          </div>
        )}
        {!loading && (!data || !free) && <span className="hint">لا توجد أوقات متاحة لهذه الخدمة في هذا اليوم. جرّب يوماً آخر.</span>}
      </div>
      {chosen && !chosen.reason && value.startMin !== null && (
        <div className="alert success">
          <span style={{ flex: 'none' }}>✓</span>
          <div>
            {memberName(chosen.memberId)} متاح يوم {DAYS[weekdayOf(value.date)]} من {clock(value.startMin)} إلى {clock(value.startMin + dur)}، ولا يوجد تعارض مع حجوزات أخرى.
          </div>
        </div>
      )}
    </>
  );
}
