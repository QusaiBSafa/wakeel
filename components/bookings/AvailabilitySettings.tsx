'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { BUFFERS, DURATIONS, HORIZON_OPTIONS, LEAD_OPTIONS } from '@/lib/constants';
import { DAYS, MONTHS, dateTitle, durText } from '@/lib/format';
import { hhmm, toMin } from '@/lib/time';
import type { BookingsData } from '@/lib/server/loaders/bookings';
import { bookableMembers } from '@/lib/team';
import LeaveDialog, { type Leave } from './LeaveDialog';

type Row = { on: boolean; open: string; close: string; bs: string; be: string };
type Svc = { id: string; name: string; dur: number; buf: number; staffIds: string[] };
type Closure = { id?: string; date: string; note: string };
type Rules = { leadMinutes: number; horizonDays: number; autoConfirm: boolean };
type Base = { rows: Row[]; svcs: Svc[]; closures: Closure[]; rules: Rules };

const LEAD_LABEL: Record<number, string> = { 0: 'بدون', 60: 'ساعة', 120: 'ساعتان', 1440: 'يوم' };
const HORIZON_LABEL: Record<number, string> = { 7: 'أسبوع', 30: 'شهر', 90: '3 شهور' };

function baseOf(d: BookingsData): Base {
  return {
    rows: Array.from({ length: 7 }, (_, wd) => {
      const h = d.hours.find((x) => x.weekday === wd);
      return h
        ? { on: h.open, open: hhmm(h.openMin), close: hhmm(h.closeMin), bs: h.breakStartMin === null ? '' : hhmm(h.breakStartMin), be: h.breakEndMin === null ? '' : hhmm(h.breakEndMin) }
        : { on: wd !== 6, open: '09:00', close: '19:00', bs: '', be: '' };
    }),
    svcs: d.services.map((s) => ({ id: s.id, name: s.name, dur: s.durationMin ?? 60, buf: s.bufferMin, staffIds: s.staffIds })),
    closures: d.closures.map((c) => ({ id: c.id, date: c.date, note: c.note })),
    rules: d.rules,
  };
}

function rowError(r: Row): string {
  if (!r.on) return '';
  if (toMin(r.close) <= toMin(r.open)) return 'يجب أن يكون وقت الإغلاق بعد وقت الفتح';
  if (!r.bs && !r.be) return '';
  if (!r.bs || !r.be || !(toMin(r.open) <= toMin(r.bs) && toMin(r.bs) < toMin(r.be) && toMin(r.be) <= toMin(r.close))) return 'يجب أن تكون الاستراحة ضمن ساعات العمل';
  return '';
}

function leaveText(l: { from: string; to: string }) {
  const [, m1, d1] = l.from.split('-').map(Number);
  const [, m2, d2] = l.to.split('-').map(Number);
  if (l.from === l.to) return `إجازة يوم ${d1} ${MONTHS[m1 - 1]}`;
  return m1 === m2 ? `إجازة من ${d1} إلى ${d2} ${MONTHS[m1 - 1]}` : `إجازة من ${d1} ${MONTHS[m1 - 1]} إلى ${d2} ${MONTHS[m2 - 1]}`;
}

export default function AvailabilitySettings({ data }: { data: BookingsData }) {
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [base, setBase] = useState<Base>(() => baseOf(data));
  const [rows, setRows] = useState<Row[]>(base.rows);
  const [svcs, setSvcs] = useState<Svc[]>(base.svcs);
  const [closures, setClosures] = useState<Closure[]>(base.closures);
  const [rules, setRules] = useState<Rules>(base.rules);
  const [leaves, setLeaves] = useState<Leave[]>(data.leaves);
  const [hDate, setHDate] = useState('');
  const [hNote, setHNote] = useState('');
  const [hErr, setHErr] = useState('');
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  if (src !== data) {
    const b = baseOf(data);
    setSrc(data);
    setBase(b);
    setRows(b.rows);
    setSvcs(b.svcs);
    setClosures(b.closures);
    setRules(b.rules);
    setLeaves(data.leaves);
  }

  const dirty = JSON.stringify({ rows, svcs, closures: closures.map(({ date, note }) => ({ date, note })), rules }) !== JSON.stringify({ rows: base.rows, svcs: base.svcs, closures: base.closures.map(({ date, note }) => ({ date, note })), rules: base.rules });
  const hasError = rows.some((r) => rowError(r));
  const staff = bookableMembers(data.members);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  async function save() {
    if (hasError) {
      toast('راجع أوقات العمل قبل الحفظ', { kind: 'bad' });
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ hours: BookingsData['hours']; rules: Rules; closures: BookingsData['closures']; services: { id: string; durationMin: number | null; bufferMin: number }[] }>('PUT', '/api/app/availability', {
        hours: rows.map((x, weekday) => ({ weekday, open: x.on, from: x.open, to: x.close, breakFrom: x.bs && x.be ? x.bs : null, breakTo: x.bs && x.be ? x.be : null })),
        rules,
        services: svcs.map((s) => ({ id: s.id, durationMin: s.dur, bufferMin: s.buf })),
        closures: closures.map(({ date, note }) => ({ date, note })),
      });
      const b = baseOf({ ...data, hours: r.hours, rules: r.rules, closures: r.closures, services: data.services.map((s) => ({ ...s, ...(r.services.find((x) => x.id === s.id) ? { durationMin: r.services.find((x) => x.id === s.id)!.durationMin, bufferMin: r.services.find((x) => x.id === s.id)!.bufferMin } : {}) })) });
      setBase(b);
      setRows(b.rows);
      setSvcs(b.svcs);
      setClosures(b.closures);
      setRules(b.rules);
      toast('تم حفظ أوقات العمل، ويستخدمها هُدهُد الآن');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setRows(base.rows);
    setSvcs(base.svcs);
    setClosures(base.closures);
    setRules(base.rules);
    toast('أُعيدت الأوقات كما كانت');
  }

  async function removeLeave(l: Leave) {
    try {
      await api('DELETE', `/api/app/leaves/${l.id}`);
      setLeaves((x) => x.filter((y) => y.id !== l.id));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  const upd = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const opts = (list: readonly number[], cur: number) => (list.includes(cur) ? list : [...list, cur].sort((a, b) => a - b));

  return (
    <>
      {dirty && (
        <div className="alert warning" role="status" style={{ alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 8, zIndex: 5 }}>
          <span className="grow" style={{ flex: '1 1 200px' }}>
            <b>لديك تغييرات غير محفوظة.</b> سيستخدم هُدهُد الأوقات الجديدة بعد الحفظ.
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={discard}>
            تجاهل
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
            {saving && <span className="spin" />}
            احفظ التغييرات
          </button>
        </div>
      )}

      <div className="split">
        <div className="col" style={{ gap: 20 }}>
          <section className="card" aria-labelledby="wh-h">
            <div className="card-head">
              <h2 id="wh-h">أوقات العمل والاستراحة</h2>
              <span className="subtle">تظهر الأوقات نفسها في معلومات نشاطك</span>
            </div>
            <ul>
              {rows.map((r, i) => {
                const err = rowError(r);
                return (
                  <li key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #E6E9F0' }}>
                    <div className="row" style={{ flex: '0 0 140px', gap: 12 }}>
                      <button type="button" className={r.on ? 'sw on' : 'sw'} role="switch" aria-checked={r.on} aria-label={`العمل يوم ${DAYS[i]}`} onClick={() => upd(i, { on: !r.on })} />
                      <b>{DAYS[i]}</b>
                    </div>
                    {r.on ? (
                      <div className="row" style={{ flex: '1 1 380px', flexWrap: 'wrap', gap: 8 }}>
                        <span className="row t-row" style={{ gap: 6 }}>
                          <input className="input t-in" type="time" value={r.open} onChange={(e) => upd(i, { open: e.target.value })} aria-label={`فتح يوم ${DAYS[i]}`} />
                          <span className="muted">–</span>
                          <input className={err && toMin(r.close) <= toMin(r.open) ? 'input bad t-in' : 'input t-in'} type="time" value={r.close} onChange={(e) => upd(i, { close: e.target.value })} aria-label={`إغلاق يوم ${DAYS[i]}`} />
                        </span>
                        <span className="row subtle t-row" style={{ gap: 6 }}>
                          <span style={{ width: 52, flex: 'none' }}>استراحة</span>
                          <input className="input t-in" type="time" value={r.bs} onChange={(e) => upd(i, { bs: e.target.value })} aria-label={`بداية الاستراحة يوم ${DAYS[i]}`} />
                          <span>–</span>
                          <input className="input t-in" type="time" value={r.be} onChange={(e) => upd(i, { be: e.target.value })} aria-label={`نهاية الاستراحة يوم ${DAYS[i]}`} />
                        </span>
                        {err && (
                          <span className="err" style={{ flexBasis: '100%' }}>
                            {err}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="muted">مغلق</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card" aria-labelledby="sv-h">
            <div className="card-head">
              <h2 id="sv-h">مدة الخدمات</h2>
              <Link href="/dashboard/catalog?tab=services">الأسعار والتفاصيل</Link>
            </div>
            {svcs.length === 0 ? (
              <div className="card-body">
                <p className="muted" style={{ fontSize: 14 }}>
                  لم تُضف خدمات بعد. أضفها من صفحة المنتجات والخدمات.
                </p>
              </div>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th scope="col">الخدمة</th>
                      <th scope="col">المدة</th>
                      <th scope="col">وقت التجهيز بعدها</th>
                      <th scope="col">من يقدّمها</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svcs.map((s, i) => (
                      <tr key={s.id} style={{ cursor: 'default' }}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td>
                          <label className="sr-only" htmlFor={`dur-${s.id}`}>مدة {s.name}</label>
                          <select id={`dur-${s.id}`} className="input" value={s.dur} onChange={(e) => setSvcs((x) => x.map((y, k) => (k === i ? { ...y, dur: Number(e.target.value) } : y)))} style={{ width: 120 }}>
                            {opts(DURATIONS, s.dur).map((d) => (
                              <option key={d} value={d}>
                                {durText(d)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`buf-${s.id}`}>وقت التجهيز بعد {s.name}</label>
                          <select id={`buf-${s.id}`} className="input" value={s.buf} onChange={(e) => setSvcs((x) => x.map((y, k) => (k === i ? { ...y, buf: Number(e.target.value) } : y)))} style={{ width: 110 }}>
                            {opts(BUFFERS, s.buf).map((d) => (
                              <option key={d} value={d}>
                                {d === 0 ? 'بدون' : `${d} د`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="muted">{data.members.filter((m) => s.staffIds.includes(m.id)).map((m) => m.name).join('، ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="col" style={{ gap: 20 }}>
          <section className="card" aria-labelledby="hol-h">
            <div className="card-head">
              <h2 id="hol-h">العطل والأيام المغلقة</h2>
            </div>
            <div className="card-body col" style={{ gap: 10 }}>
              <ul className="col" style={{ gap: 8 }}>
                {closures.map((x) => (
                  <li key={x.date} className="row" style={{ gap: 10, background: '#FAFBF8', border: '1px solid #E6E9F0', borderRadius: 12, padding: '8px 10px' }}>
                    <div className="grow">
                      <b style={{ display: 'block', fontSize: 14 }}>{dateTitle(x.date)}</b>
                      <span className="subtle">{x.note || 'مغلق طوال اليوم'}</span>
                    </div>
                    <button type="button" className="ib sm danger" onClick={() => setClosures((c) => c.filter((y) => y.date !== x.date))} aria-label={`إزالة ${dateTitle(x.date)}`}>
                      <Icon name="close" size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="field">
                <label htmlFor="h-d">التاريخ</label>
                <input
                  id="h-d"
                  className={hErr ? 'input bad' : 'input'}
                  type="date"
                  value={hDate}
                  onChange={(e) => {
                    setHDate(e.target.value);
                    setHErr('');
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="h-n">
                  السبب <span className="opt">(اختياري)</span>
                </label>
                <input id="h-n" className="input" value={hNote} onChange={(e) => setHNote(e.target.value)} placeholder="عيد، مناسبة…" />
              </div>
              {hErr && <span className="err">{hErr}</span>}
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => {
                  if (!hDate) {
                    setHErr('اختر التاريخ');
                    return;
                  }
                  setClosures((c) => (c.some((y) => y.date === hDate) ? c : [...c, { date: hDate, note: hNote.trim() }].sort((a, b) => (a.date < b.date ? -1 : 1))));
                  setHDate('');
                  setHNote('');
                }}
              >
                إضافة يوم مغلق
              </button>
            </div>
          </section>

          <section className="card" aria-labelledby="off-h">
            <div className="card-head">
              <h2 id="off-h">غياب الموظفين</h2>
            </div>
            <ul>
              {leaves.map((l) => {
                const m = data.members.find((x) => x.id === l.memberId);
                return (
                  <li key={l.id} className="row" style={{ gap: 10, padding: '12px 20px', borderTop: '1px solid #E6E9F0' }}>
                    <Avatar name={m?.name || '؟'} color={m?.color} size="sm" />
                    <div className="grow">
                      <b style={{ display: 'block', fontSize: 14 }}>{m?.name}</b>
                      <span className="subtle">{leaveText(l)}</span>
                    </div>
                    <span className="bdg neutral">غير متاح للحجز</span>
                    <button type="button" className="ib sm danger" onClick={() => removeLeave(l)} aria-label={`حذف غياب ${m?.name || ''}`}>
                      <Icon name="close" size="sm" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="card-foot">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLeaveOpen(true)} disabled={staff.length === 0}>
                إضافة غياب
              </button>
            </div>
          </section>

          <section className="card card-pad col" style={{ gap: 12 }} aria-labelledby="rl-h">
            <h2 id="rl-h">قواعد الحجز</h2>
            <div className="field">
              <label htmlFor="r-lead">أقل مدة قبل الموعد</label>
              <select id="r-lead" className="input" value={rules.leadMinutes} onChange={(e) => setRules({ ...rules, leadMinutes: Number(e.target.value) })}>
                {LEAD_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {LEAD_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="r-far">أبعد موعد يمكن للعميل حجزه</label>
              <select id="r-far" className="input" value={rules.horizonDays} onChange={(e) => setRules({ ...rules, horizonDays: Number(e.target.value) })}>
                {HORIZON_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {HORIZON_LABEL[n]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <span className="lbl">تأكيد الحجوزات</span>
              <label className={rules.autoConfirm ? 'radio-card on' : 'radio-card'}>
                <input type="radio" name="cf" checked={rules.autoConfirm} onChange={() => setRules({ ...rules, autoConfirm: true })} />
                <span>
                  <b>يؤكّد هُدهُد الحجز تلقائياً</b>
                  <span className="subtle">إذا كان الموعد متاحاً، يُحجز فوراً</span>
                </span>
              </label>
              <label className={rules.autoConfirm ? 'radio-card' : 'radio-card on'} style={{ marginTop: 8 }}>
                <input type="radio" name="cf" checked={!rules.autoConfirm} onChange={() => setRules({ ...rules, autoConfirm: false })} />
                <span>
                  <b>أريد الموافقة على كل حجز</b>
                  <span className="subtle">يبقى الحجز «بانتظار التأكيد» حتى توافق عليه</span>
                </span>
              </label>
            </div>
          </section>
        </div>
      </div>

      {leaveOpen && <LeaveDialog members={staff} onClose={() => setLeaveOpen(false)} onSaved={(l) => setLeaves((x) => [...x, l])} />}
    </>
  );
}
