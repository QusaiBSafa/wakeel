'use client';

import { useState } from 'react';
import { useStore } from '@/components/app/Store';
import Switch from '@/components/ui/Switch';
import { Icon } from '@/components/ui/icons';
import { BUFFER_OPTIONS, DAYS, MAX_RANGES_PER_DAY, SLOT_OPTIONS } from '@/lib/constants';
import { fmt, hhmm, rangeError, rangesValid, slotStarts, toMin, weekSlotCount, type Day } from '@/lib/slots';
import type { BookingDTO, ClosureDTO } from '@/lib/types';
import { api, ApiError } from '@/lib/client/api';

const PRESETS = ['15', '30', '45', '60'];

function closureLabel(date: string) {
  try {
    return new Date(date + 'T12:00:00').toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return date;
  }
}

export default function BookingPage() {
  const { state, setState, queueBooking, showToast, track } = useStore();
  const b = state.booking;
  const [slotMode, setSlotMode] = useState(PRESETS.includes(String(b.slotMinutes)) ? String(b.slotMinutes) : 'custom');
  const [customSlot, setCustomSlot] = useState(PRESETS.includes(String(b.slotMinutes)) ? '20' : String(b.slotMinutes));
  const [prevDay, setPrevDay] = useState(0);
  const [newDate, setNewDate] = useState('');
  const [newNote, setNewNote] = useState('');
  const [exErr, setExErr] = useState('');

  const customN = parseInt(customSlot, 10);
  const customOk = customN >= 5 && customN <= 480;
  const len = slotMode === 'custom' ? (customOk ? customN : 0) : Number(slotMode);

  /** Apply a change locally and save it if everything is valid (invalid ranges stay local and show errors). */
  const update = (next: BookingDTO) => {
    setState((s) => ({ ...s, booking: next }));
    const valid = next.days.every((d) => rangesValid(d.ranges)) && next.slotMinutes >= 5 && next.slotMinutes <= 480;
    if (valid) queueBooking(next);
  };
  const updDay = (i: number, fn: (d: Day) => Day) => update({ ...b, days: b.days.map((d, k) => (k === i ? fn(d) : d)) });

  const pickSlot = (mode: string) => {
    setSlotMode(mode);
    const minutes = mode === 'custom' ? (customOk ? customN : 0) : Number(mode);
    if (minutes) update({ ...b, slotMinutes: minutes });
  };

  const addClosure = async () => {
    if (!newDate) return setExErr('اختار التاريخ');
    if (state.closures.some((x) => x.date === newDate)) return setExErr('هاليوم مضاف من قبل');
    const tmp: ClosureDTO = { id: `tmp-${Date.now()}`, date: newDate, note: newNote.trim() };
    setState((s) => ({ ...s, closures: [...s.closures, tmp] }));
    setNewDate('');
    setNewNote('');
    setExErr('');
    try {
      const saved = await track(api<ClosureDTO>('POST', '/api/app/closures', { date: tmp.date, note: tmp.note }));
      setState((s) => ({ ...s, closures: s.closures.map((c) => (c.id === tmp.id ? saved : c)) }));
    } catch (e) {
      setState((s) => ({ ...s, closures: s.closures.filter((c) => c.id !== tmp.id) }));
      showToast(e instanceof ApiError ? e.message : 'ما قدرنا نضيف الإجازة');
    }
  };

  const removeClosure = async (c: ClosureDTO) => {
    setState((s) => ({ ...s, closures: s.closures.filter((x) => x.id !== c.id) }));
    try {
      await track(api('DELETE', `/api/app/closures/${c.id}`));
    } catch {
      setState((s) => ({ ...s, closures: [...s.closures, c] }));
      showToast('ما قدرنا نحذف الإجازة. رجّعناها.');
    }
  };

  const prevD = b.days[prevDay];
  const slots = b.enabled && len ? slotStarts(prevD, len, b.bufferMinutes) : [];
  const weekSlots = b.enabled && len ? weekSlotCount(b.days, len, b.bufferMinutes) : 0;
  const closuresSorted = state.closures.slice().sort((x, y) => (x.date < y.date ? -1 : 1));

  return (
    <>
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>المواعيد</h1>
        <p className="muted">حدد إيمتى بتستقبل حجوزات. التغييرات بتنحفظ لحالها.</p>
      </div>

      <section className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 800 }}>استقبال الحجوزات</h2>
          <p className="muted">{b.enabled ? 'مفعّل: هُدهُد بعرض الأوقات الفاضية وبحجز للزباين.' : 'مطفي: هُدهُد ما رح يحجز مواعيد، بس بجاوب الأسئلة.'}</p>
        </div>
        <Switch on={b.enabled} onToggle={() => update({ ...b, enabled: !b.enabled })} label="استقبال الحجوزات" />
      </section>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, opacity: b.enabled ? 1 : 0.5 }}>
        <section className="card sched" aria-labelledby="wk-h" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <h2 id="wk-h" style={{ fontSize: 19, fontWeight: 800 }}>
              أوقات الدوام الأسبوعية
            </h2>
            <span className="hint">بتقدر تضيف أكثر من فترة باليوم (مثلاً 10–2 و 4–8)</span>
          </div>
          {b.days.map((d, i) => (
            <div className="day-row" key={DAYS[i]}>
              <div className="day-head">
                <Switch on={d.on} onToggle={() => updDay(i, (x) => ({ ...x, on: !x.on }))} label={`استقبال حجوزات يوم ${DAYS[i]}`} />
                <span style={{ fontWeight: 800 }}>{DAYS[i]}</span>
              </div>
              {!d.on ? (
                <span className="muted" style={{ minHeight: 48, display: 'flex', alignItems: 'center' }}>
                  مغلق
                </span>
              ) : (
                <div className="day-ranges">
                  {d.ranges.map((r, j) => {
                    const err = rangeError(d.ranges, j);
                    const setR = (k: 's' | 'e') => (e: React.ChangeEvent<HTMLInputElement>) =>
                      updDay(i, (x) => ({ ...x, ranges: x.ranges.map((rr, kk) => (kk === j ? { ...rr, [k]: e.target.value } : rr)) }));
                    return (
                      <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div className="range-row">
                          <input className={err ? 'input bad t-in' : 'input t-in'} type="time" value={r.s} onChange={setR('s')} aria-label={`بداية الفترة ${j + 1} يوم ${DAYS[i]}`} aria-invalid={!!err} />
                          <span className="muted to-sep">إلى</span>
                          <input className={err ? 'input bad t-in' : 'input t-in'} type="time" value={r.e} onChange={setR('e')} aria-label={`نهاية الفترة ${j + 1} يوم ${DAYS[i]}`} aria-invalid={!!err} />
                          {d.ranges.length > 1 && (
                            <button
                              type="button"
                              className="icon-btn sm"
                              onClick={() => updDay(i, (x) => ({ ...x, ranges: x.ranges.filter((_, kk) => kk !== j) }))}
                              aria-label={`احذف الفترة ${j + 1} يوم ${DAYS[i]}`}
                            >
                              <Icon name="close" />
                            </button>
                          )}
                        </div>
                        {err && (
                          <div className="err" role="alert">
                            {err}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {d.ranges.length < MAX_RANGES_PER_DAY && (
                      <button
                        type="button"
                        className="btn btn-text btn-sm"
                        aria-label={`أضف فترة ليوم ${DAYS[i]}`}
                        onClick={() =>
                          updDay(i, (x) => {
                            const last = x.ranges[x.ranges.length - 1];
                            const st = Math.min(toMin(last.e) + 60, 22 * 60);
                            return { ...x, ranges: [...x.ranges, { s: hhmm(st), e: hhmm(Math.min(st + 120, 23 * 60 + 30)) }] };
                          })
                        }
                      >
                        + أضف فترة
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-text btn-sm"
                      aria-label={`انسخ أوقات ${DAYS[i]} لكل الأيام المفتوحة`}
                      onClick={() => {
                        update({ ...b, days: b.days.map((x) => (x.on ? { ...x, ranges: d.ranges.map((r) => ({ ...r })) } : x)) });
                        showToast(`انسخت أوقات ${DAYS[i]} لكل الأيام المفتوحة`);
                      }}
                    >
                      انسخ لكل الأيام المفتوحة
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="two">
          <section className="card" aria-labelledby="sl-h" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 id="sl-h" style={{ fontSize: 19, fontWeight: 800 }}>
              مدة الموعد
            </h2>
            <div role="radiogroup" aria-labelledby="sl-h" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SLOT_OPTIONS.map(([k, label]) => (
                <button key={k} type="button" className={slotMode === k ? 'chip on' : 'chip'} role="radio" aria-checked={slotMode === k} onClick={() => pickSlot(k)}>
                  {label}
                </button>
              ))}
            </div>
            {slotMode === 'custom' && (
              <div className="field">
                <label htmlFor="sl-custom">مدة مخصّصة بالدقائق</label>
                <input
                  id="sl-custom"
                  className={customOk ? 'input' : 'input bad'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  dir="ltr"
                  value={customSlot}
                  aria-invalid={!customOk}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
                    setCustomSlot(v);
                    const n = parseInt(v, 10);
                    if (n >= 5 && n <= 480) update({ ...b, slotMinutes: n });
                  }}
                  style={{ maxWidth: 160 }}
                />
                {!customOk && <div className="err">بين 5 و 480 دقيقة</div>}
              </div>
            )}
            <div className="field">
              <label htmlFor="sl-buf">
                فاصل بين المواعيد <span className="opt">(اختياري)</span>
              </label>
              <select id="sl-buf" className="input" value={b.bufferMinutes} onChange={(e) => update({ ...b, bufferMinutes: Number(e.target.value) })}>
                {BUFFER_OPTIONS.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="hint">وقت تجهيز أو تنظيف بين كل زبون والثاني.</span>
            </div>
          </section>

          <section className="card" aria-labelledby="ex-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 id="ex-h" style={{ fontSize: 19, fontWeight: 800 }}>
              إجازات وأيام استثنائية
            </h2>
            {closuresSorted.length ? (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {closuresSorted.map((c) => {
                  const label = closureLabel(c.date);
                  return (
                    <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F7F8F4', borderRadius: 12, padding: '8px 12px' }}>
                      <Icon name="calendar" style={{ color: '#4A5468' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{label}</div>
                        <div className="hint">{c.note || 'مغلق طول اليوم'}</div>
                      </div>
                      <button type="button" className="icon-btn sm danger" onClick={() => removeClosure(c)} aria-label={`احذف إجازة ${label}`}>
                        <Icon name="close" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="hint">ما في إجازات. أضف أي يوم رح تكون فيه مسكّر.</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: '1 1 150px' }}>
                <label htmlFor="ex-d">التاريخ</label>
                <input
                  id="ex-d"
                  className={exErr ? 'input bad' : 'input'}
                  type="date"
                  value={newDate}
                  onChange={(e) => {
                    setNewDate(e.target.value);
                    setExErr('');
                  }}
                />
              </div>
              <div className="field" style={{ flex: '1 1 150px' }}>
                <label htmlFor="ex-n">
                  ملاحظة <span className="opt">(اختياري)</span>
                </label>
                <input id="ex-n" className="input" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="عيد، سفر…" maxLength={100} />
              </div>
              <button type="button" className="btn btn-soft" onClick={addClosure}>
                أضف
              </button>
            </div>
            {exErr && <div className="err">{exErr}</div>}
          </section>
        </div>

        <section className="card" aria-labelledby="pr-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
            <h2 id="pr-h" style={{ fontSize: 19, fontWeight: 800 }}>
              معاينة المواعيد
            </h2>
            <span className="hint">{weekSlots} موعد متاح بالأسبوع</span>
          </div>
          <div role="tablist" aria-label="اختار يوم للمعاينة" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {DAYS.map((name, i) => (
              <button key={name} type="button" role="tab" className={prevDay === i ? 'chip on' : 'chip'} aria-selected={prevDay === i} onClick={() => setPrevDay(i)} style={{ flex: 'none' }}>
                {name}
              </button>
            ))}
          </div>
          <div aria-live="polite">
            {slots.length ? (
              <>
                <p className="muted" style={{ marginBottom: 10 }}>
                  {slots.length} موعد يوم {DAYS[prevDay]}، كل موعد {len} دقيقة{b.bufferMinutes ? ` وبعده ${b.bufferMinutes} دقائق فاصل` : ''}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((t) => (
                    <span key={t} className="slot">
                      {fmt(t)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">
                {!b.enabled
                  ? 'الحجز مطفي، فما في مواعيد.'
                  : !prevD.on
                    ? `يوم ${DAYS[prevDay]} مغلق، ما في مواعيد.`
                    : !len
                      ? 'اختار مدة موعد صحيحة لتشوف المعاينة.'
                      : 'الفترات بهاليوم أقصر من مدة الموعد، أو فيها خطأ.'}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
