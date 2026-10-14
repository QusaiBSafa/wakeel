'use client';

import { Icon } from '@/components/ui/Icon';
import { BUSINESS_TYPES, CITIES, type Offers } from '@/lib/constants';
import { DAYS } from '@/lib/format';
import type { DayHours, FaqRow } from '@/lib/onboarding';
import type { OnbInfo, OnbRow, OnbZone } from './types';

const OFFER_LABELS: [keyof Offers, string][] = [
  ['products', 'منتجات للبيع'],
  ['services', 'خدمات بمواعيد'],
  ['delivery', 'توصيل'],
];

export function StepType({ type, offers, err, onType, onOffers }: { type: string; offers: Offers; err: boolean; onType: (k: string) => void; onOffers: (o: Offers) => void }) {
  return (
    <>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">نوع النشاط</legend>
        <div className="ob-types">
          {BUSINESS_TYPES.map((t) => (
            <label key={t.k} className={type === t.k ? 'ob-type on' : 'ob-type'}>
              <input type="radio" name="btype" className="sr-only" checked={type === t.k} onChange={() => onType(t.k)} />
              <span className="ic brand" style={{ display: 'grid', placeItems: 'center' }}>
                <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={t.icon} />
                </svg>
              </span>
              <b>{t.label}</b>
              <span className="subtle">{t.example}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {err && (
        <p className="err" role="alert" style={{ marginTop: 10 }}>
          اختر نوع نشاطك للمتابعة
        </p>
      )}
      {type && (
        <fieldset className="field" style={{ border: 0, padding: 0, margin: '20px 0 0' }}>
          <legend className="lbl" style={{ marginBottom: 8 }}>
            ماذا تقدّم لعملائك؟ <span className="opt">(اختر كل ما ينطبق)</span>
          </legend>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {OFFER_LABELS.map(([k, label]) => (
              <label key={k} className={offers[k] ? 'check on' : 'check'}>
                <input type="checkbox" checked={offers[k]} onChange={() => onOffers({ ...offers, [k]: !offers[k] })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <span className="hint">نعرض لك الخطوات التي تناسب نشاطك فقط.</span>
        </fieldset>
      )}
    </>
  );
}

export function StepInfo({ f, touched, onChange }: { f: OnbInfo; touched: boolean; onChange: (k: keyof OnbInfo, v: string) => void }) {
  const nameErr = touched && !f.name.trim();
  const phoneErr = touched && !/^\+?[\d][\d\s\-()]{7,18}$/.test(f.phone.trim());
  return (
    <div className="card card-body col" style={{ gap: 16 }}>
      <div className="field">
        <label htmlFor="o-name">
          اسم النشاط <span className="req" aria-hidden="true">*</span>
        </label>
        <input id="o-name" className={nameErr ? 'input bad' : 'input'} value={f.name} onChange={(e) => onChange('name', e.target.value)} placeholder="مثلاً: مركز لمسة للتجميل" aria-required="true" />
        {nameErr && <span className="err">اكتب اسم النشاط</span>}
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="o-city">المدينة</label>
          <select id="o-city" className="input" value={f.city} onChange={(e) => onChange('city', e.target.value)}>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="o-phone">
            رقم الهاتف <span className="req" aria-hidden="true">*</span>
          </label>
          <input id="o-phone" className={phoneErr ? 'input bad' : 'input'} type="tel" inputMode="tel" dir="ltr" value={f.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="+970 59 123 4567" aria-required="true" />
          {phoneErr && <span className="err">اكتب رقماً صحيحاً</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="o-addr">
          العنوان <span className="opt">(اختياري)</span>
        </label>
        <input id="o-addr" className="input" value={f.addr} onChange={(e) => onChange('addr', e.target.value)} placeholder="الشارع، المبنى، أقرب معلم" />
      </div>
      <div className="field">
        <label htmlFor="o-desc">
          وصف قصير <span className="opt">(اختياري)</span>
        </label>
        <textarea id="o-desc" className="input" value={f.desc} onChange={(e) => onChange('desc', e.target.value)} placeholder="ماذا تقدّم؟ وما الذي يميّزك؟" />
        <span className="hint">يستخدمه هُدهُد عند التعريف بنشاطك. يمكنك تعديله لاحقاً.</span>
      </div>
    </div>
  );
}

const PRESETS: [string, number[], string, string][] = [
  ['السبت–الخميس، 9–7', [0, 1, 2, 3, 4, 5], '09:00', '19:00'],
  ['كل الأيام، 10–10', [0, 1, 2, 3, 4, 5, 6], '10:00', '22:00'],
  ['الأحد–الخميس، 8–4', [1, 2, 3, 4, 5], '08:00', '16:00'],
];

export function StepHours({ hours, onChange }: { hours: DayHours[]; onChange: (h: DayHours[]) => void }) {
  const upd = (i: number, p: Partial<DayHours>) => onChange(hours.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <div className="card">
      <div className="card-body row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <span className="subtle">اختيار سريع:</span>
        {PRESETS.map(([label, days, from, to]) => (
          <button key={label} type="button" className="chip sm" onClick={() => onChange(DAYS.map((_, i) => ({ on: days.includes(i), from, to })))}>
            {label}
          </button>
        ))}
      </div>
      <ul>
        {hours.map((h, i) => (
          <li key={i} className="row" style={{ gap: '12px 16px', padding: '10px 20px', borderTop: '1px solid #E6E9F0', flexWrap: 'wrap' }}>
            <div className="row" style={{ flex: '0 0 130px', gap: 12 }}>
              <button type="button" className={h.on ? 'sw on' : 'sw'} role="switch" aria-checked={h.on} aria-label={`يوم عمل: ${DAYS[i]}`} onClick={() => upd(i, { on: !h.on })} />
              <b>{DAYS[i]}</b>
            </div>
            {h.on ? (
              <div className="row t-row" style={{ gap: 8 }}>
                <label className="sr-only" htmlFor={`hf${i}`}>من</label>
                <input id={`hf${i}`} className="input t-in" type="time" value={h.from} onChange={(e) => upd(i, { from: e.target.value })} />
                <span className="muted">إلى</span>
                <label className="sr-only" htmlFor={`ht${i}`}>إلى</label>
                <input id={`ht${i}`} className="input t-in" type="time" value={h.to} onChange={(e) => upd(i, { to: e.target.value })} />
              </div>
            ) : (
              <span className="muted">مغلق</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StepCatalog({ rows, offers, onChange, onImport }: { rows: OnbRow[]; offers: Offers; onChange: (r: OnbRow[]) => void; onImport: () => void }) {
  const svc = offers.services;
  const prod = offers.products;
  const upd = (i: number, p: Partial<OnbRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const visible = rows.map((r, i) => ({ r, i })).filter((x) => (x.r.kind === 'service' ? svc : prod));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>{svc && prod ? 'خدماتك ومنتجاتك' : svc ? 'خدماتك' : 'منتجاتك'}</h2>
          <span className="subtle">أضف الأهم الآن، والباقي لاحقاً من صفحة المنتجات والخدمات</span>
        </div>
      </div>
      <ul>
        {visible.map(({ r, i }) => (
          <li key={i} className="ob-row">
            <div className="field" style={{ flex: '1 1 200px' }}>
              <label className="sr-only" htmlFor={`rn${i}`}>الاسم</label>
              <input id={`rn${i}`} className="input" value={r.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder={r.kind === 'service' ? 'اسم الخدمة' : 'اسم المنتج'} />
            </div>
            <div className="row" style={{ gap: 6 }}>
              <label className="sr-only" htmlFor={`rp${i}`}>السعر بالشيكل</label>
              <input id={`rp${i}`} className="input ltr" inputMode="decimal" value={r.price} onChange={(e) => upd(i, { price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" style={{ width: 84 }} />
              <span className="muted">₪</span>
            </div>
            {r.kind === 'service' && (
              <div>
                <label className="sr-only" htmlFor={`rd${i}`}>المدة</label>
                <select id={`rd${i}`} className="input" value={r.dur} onChange={(e) => upd(i, { dur: e.target.value })} style={{ width: 120 }}>
                  <option value="30">30 دقيقة</option>
                  <option value="45">45 دقيقة</option>
                  <option value="60">ساعة</option>
                  <option value="90">ساعة ونصف</option>
                  <option value="120">ساعتان</option>
                </select>
              </div>
            )}
            <button type="button" className="ib sm danger" onClick={() => onChange(rows.filter((_, k) => k !== i))} aria-label={`حذف ${r.name || 'السطر'}`}>
              <Icon name="close" size="sm" />
            </button>
          </li>
        ))}
      </ul>
      <div className="card-foot" style={{ justifyContent: 'space-between' }}>
        <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {svc && (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => onChange([...rows, { kind: 'service', name: '', price: '', dur: '60' }])}>
              + خدمة
            </button>
          )}
          {prod && (
            <button type="button" className="btn btn-soft btn-sm" onClick={() => onChange([...rows, { kind: 'product', name: '', price: '', dur: '' }])}>
              + منتج
            </button>
          )}
        </span>
        <button type="button" className="btn-link" onClick={onImport}>
          أو ارفع ملف Excel
        </button>
      </div>
    </div>
  );
}

export function StepDelivery({ applicable, zones, freeOver, onZones, onFree, onEnable }: { applicable: boolean; zones: OnbZone[]; freeOver: string; onZones: (z: OnbZone[]) => void; onFree: (v: string) => void; onEnable: () => void }) {
  if (!applicable)
    return (
      <div className="card empty">
        <span className="ic neutral" style={{ display: 'grid', placeItems: 'center' }}>
          <Icon name="truckOff" size="xl" />
        </span>
        <h2>لا تحتاج إلى هذه الخطوة</h2>
        <p className="muted">لم تختر «توصيل» في الخطوة الأولى، لذا سيخبر هُدهُد العملاء بأن الاستلام من المحل فقط.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onEnable}>
          أريد إضافة التوصيل
        </button>
      </div>
    );
  const upd = (i: number, p: Partial<OnbZone>) => onZones(zones.map((z, k) => (k === i ? { ...z, ...p } : z)));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>المناطق التي توصل إليها</h2>
          <span className="subtle">اختر المناطق واكتب رسوم كل منها</span>
        </div>
      </div>
      <ul>
        {zones.map((z, i) => (
          <li key={z.name} className="ob-row">
            <label className="row grow" style={{ gap: 10, minHeight: 40, cursor: 'pointer' }}>
              <input type="checkbox" checked={z.on} onChange={() => upd(i, { on: !z.on })} style={{ width: 18, height: 18, accentColor: '#0B7F58' }} />
              <b style={{ fontWeight: 600 }}>{z.name}</b>
            </label>
            {z.on && (
              <div className="row" style={{ gap: 6 }}>
                <label className="sr-only" htmlFor={`zf${i}`}>رسوم التوصيل إلى {z.name}</label>
                <input id={`zf${i}`} className="input ltr" inputMode="decimal" value={z.fee} onChange={(e) => upd(i, { fee: e.target.value.replace(/[^\d.]/g, '') })} style={{ width: 72 }} />
                <span className="muted">₪</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="card-foot" style={{ justifyContent: 'flex-start' }}>
        <label className="row" style={{ gap: 8, fontSize: 14 }} htmlFor="o-free">
          توصيل مجاني للطلبات فوق
          <input id="o-free" className="input ltr" inputMode="decimal" value={freeOver} onChange={(e) => onFree(e.target.value.replace(/[^\d.]/g, ''))} style={{ width: 84 }} />₪
        </label>
      </div>
    </div>
  );
}

export function StepFaq({ rows, touched, onChange }: { rows: FaqRow[]; touched: boolean; onChange: (r: FaqRow[]) => void }) {
  const upd = (i: number, p: Partial<FaqRow>) => onChange(rows.map((x, k) => (k === i ? { ...x, ...p } : x)));
  return (
    <div className="col" style={{ gap: 12 }}>
      {rows.map((q, i) => {
        const err = touched && q.on && !q.a.trim();
        return (
          <div key={q.key} className={q.on ? 'card card-body' : 'card card-body faq-off'}>
            <label className="row" style={{ gap: 10, cursor: 'pointer', minHeight: 32 }}>
              <input type="checkbox" checked={q.on} onChange={() => upd(i, { on: !q.on })} style={{ width: 18, height: 18, accentColor: '#0B7F58' }} />
              <b>{q.q}</b>
            </label>
            {q.on && (
              <div className="field" style={{ marginTop: 10 }}>
                <label className="sr-only" htmlFor={`fq${i}`}>الجواب</label>
                <textarea id={`fq${i}`} className={err ? 'input bad' : 'input'} value={q.a} onChange={(e) => upd(i, { a: e.target.value })} style={{ minHeight: 70 }} />
                {err && <span className="err">اكتب الجواب</span>}
              </div>
            )}
          </div>
        );
      })}
      <p className="hint">كتبنا أجوبة مقترحة من المعلومات التي أدخلتها. عدّلها كما تشاء.</p>
    </div>
  );
}
