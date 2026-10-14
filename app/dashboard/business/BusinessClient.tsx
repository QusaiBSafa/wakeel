'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useShell } from '@/components/shell/ShellContext';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { completeness } from '@/lib/completeness';
import { BUSINESS_TYPES, ETA_OPTIONS, typeOf } from '@/lib/constants';
import { DAYS, PHONE_RE, URL_RE, agoText, clock } from '@/lib/format';
import { minorToInput } from '@/lib/money';
import type { BusinessData } from '@/lib/server/loaders/business';
import type { BusinessInfoDTO, DeliveryAreaDTO } from '@/lib/types';

type Field = { k: string; label: string; req?: boolean; optional?: boolean; ph?: string; area?: boolean; select?: boolean; type?: string; mode?: string; ltr?: boolean; url?: boolean; phone?: boolean; hint?: string };
type SecKey = 'basic' | 'location' | 'contact' | 'policy';
const DEFS: { key: SecKey; title: string; empty: string; fields: Field[] }[] = [
  {
    key: 'basic',
    title: 'المعلومات الأساسية',
    empty: 'أضف اسم نشاطك ونوعه ووصفاً قصيراً.',
    fields: [
      { k: 'name', label: 'اسم النشاط', req: true, ph: 'مثلاً: مركز لمسة للتجميل' },
      { k: 'type', label: 'نوع النشاط', select: true },
      { k: 'description', label: 'وصف قصير', area: true, optional: true, ph: 'ماذا تقدّم؟ وما الذي يميّزك؟', hint: 'جملتان تكفيان. يستخدمه هُدهُد عند التعريف بنشاطك.' },
    ],
  },
  {
    key: 'location',
    title: 'العنوان والموقع',
    empty: 'أضف عنوانك ليرشد هُدهُد العملاء إليك.',
    fields: [
      { k: 'address', label: 'العنوان', req: true, ph: 'المدينة، الشارع، المبنى' },
      { k: 'landmark', label: 'أقرب معلم', optional: true, ph: 'مثلاً: فوق صيدلية الشفاء' },
      { k: 'mapUrl', label: 'رابط الخريطة', optional: true, type: 'url', mode: 'url', ph: 'https://maps.google.com/…', url: true },
      { k: 'parking', label: 'المواقف', optional: true, ph: 'مثلاً: موقف عام مجاني خلف المبنى' },
    ],
  },
  {
    key: 'contact',
    title: 'التواصل',
    empty: 'أضف رقم الهاتف وحسابات التواصل.',
    fields: [
      { k: 'phone', label: 'رقم الهاتف', req: true, type: 'tel', mode: 'tel', ph: '+970 59 123 4567', phone: true },
      { k: 'instagram', label: 'إنستغرام', optional: true, ph: '@username', ltr: true },
      { k: 'facebook', label: 'فيسبوك', optional: true, ph: 'facebook.com/…', ltr: true },
      { k: 'website', label: 'الموقع الإلكتروني', optional: true, type: 'url', mode: 'url', ph: 'https://', url: true },
    ],
  },
  {
    key: 'policy',
    title: 'سياسة الإرجاع والإلغاء',
    empty: 'وضّح متى يمكن للعميل إرجاع منتج أو إلغاء موعد.',
    fields: [
      { k: 'returnsPolicy', label: 'إرجاع المنتجات واستبدالها', area: true, optional: true, ph: 'مثلاً: يمكن استبدال المنتج خلال 7 أيام إذا كان مغلقاً' },
      { k: 'cancelPolicy', label: 'إلغاء المواعيد', area: true, optional: true, ph: 'مثلاً: يمكن الإلغاء قبل الموعد بثلاث ساعات على الأقل' },
    ],
  },
];

type Draft = Record<string, string>;
type AreaRow = { id?: string; name: string; fee: string; eta: string };

function errOf(fd: Field, v: string): string {
  const val = v.trim();
  if (fd.req && !val) return 'هذا الحقل مطلوب';
  if (val && fd.phone && !PHONE_RE.test(val)) return 'الرقم غير صحيح، اكتبه مع رمز الدولة';
  if (val && fd.url && !URL_RE.test(val)) return 'يجب أن يبدأ الرابط بـ https://';
  return '';
}

const toRows = (areas: DeliveryAreaDTO[]): AreaRow[] => areas.map((a) => ({ id: a.id, name: a.name, fee: minorToInput(a.feeMinor), eta: a.eta }));

export default function BusinessClient({ data }: { data: BusinessData }) {
  const toast = useToast();
  const shell = useShell();
  const [src, setSrc] = useState(data);
  const [info, setInfo] = useState<BusinessInfoDTO>(data.info);
  const [saved, setSaved] = useState<AreaRow[]>(toRows(data.areas));
  const [rows, setRows] = useState<AreaRow[]>(toRows(data.areas));
  const [freeOver, setFreeOver] = useState(data.info.freeOverMinor ? minorToInput(data.info.freeOverMinor) : '');
  const [savedFree, setSavedFree] = useState(freeOver);
  const [deliv, setDeliv] = useState(data.info.deliveryEnabled);
  const [delivUpdated, setDelivUpdated] = useState<string | null>(data.info.sectionUpdated.delivery ?? null);
  const [rules, setRules] = useState(data.info.rules);
  if (src !== data) {
    setSrc(data);
    setInfo(data.info);
    setSaved(toRows(data.areas));
    setRows(toRows(data.areas));
    const f = data.info.freeOverMinor ? minorToInput(data.info.freeOverMinor) : '';
    setFreeOver(f);
    setSavedFree(f);
    setDeliv(data.info.deliveryEnabled);
    setRules(data.info.rules);
  }
  const [editing, setEditing] = useState<SecKey | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [ruleErr, setRuleErr] = useState(false);
  const now = new Date(data.now).getTime();
  const showDelivery = shell.business.sections.delivery !== false;

  const valueOf = (k: string): string => (k === 'type' ? info.type : String((info as unknown as Record<string, unknown>)[k] ?? ''));
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });

  const c = completeness({ ...info, areaCount: saved.length, deliveryEnabled: showDelivery && deliv });

  async function saveSection(def: (typeof DEFS)[number]) {
    if (def.fields.some((fd) => errOf(fd, draft[fd.k] ?? ''))) {
      setTouched(true);
      return;
    }
    const body: Record<string, string> = { section: def.key };
    for (const fd of def.fields) body[fd.k] = (draft[fd.k] ?? '').trim();
    setSaving(true);
    try {
      setInfo(await api<BusinessInfoDTO>('PATCH', '/api/app/business', body));
      setEditing(null);
      setTouched(false);
      toast(`تم حفظ «${def.title}»، ويستخدمها هُدهُد الآن`);
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function toggleDelivery() {
    const next = !deliv;
    try {
      const r = await api<{ updated: string | null }>('PUT', '/api/app/delivery', { enabled: next });
      setDeliv(next);
      setDelivUpdated(r.updated);
      toast(next ? 'تم تفعيل التوصيل' : 'تم إيقاف التوصيل');
    } catch (e) {
      fail(e);
    }
  }

  const areasDirty = JSON.stringify(rows) !== JSON.stringify(saved) || freeOver !== savedFree;
  async function saveAreas() {
    if (rows.some((a) => !a.name.trim())) {
      toast('اكتب اسم كل منطقة قبل الحفظ', { kind: 'bad' });
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ areas: DeliveryAreaDTO[]; updated: string | null }>('PUT', '/api/app/delivery', {
        areas: rows.map((a) => ({ ...(a.id ? { id: a.id } : {}), name: a.name, fee: a.fee, eta: a.eta })),
        freeOver: freeOver.trim() || null,
      });
      const next = toRows(r.areas);
      setSaved(next);
      setRows(next);
      setSavedFree(freeOver);
      setDelivUpdated(r.updated);
      toast('تم حفظ مناطق التوصيل');
    } catch (e) {
      fail(e);
    } finally {
      setSaving(false);
    }
  }

  async function putRules(next: string[], ok?: string) {
    try {
      await api('PUT', '/api/app/business/rules', { rules: next });
      setRules(next);
      if (ok) toast(ok);
    } catch (e) {
      fail(e);
    }
  }

  const upd = (i: number, p: Partial<AreaRow>) => setRows((r) => r.map((a, k) => (k === i ? { ...a, ...p } : a)));
  const hoursUpdated = info.sectionUpdated.hours ? agoText(info.sectionUpdated.hours, now) : '—';

  return (
    <main className="page" id="main" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div className="t">
          <h1>معلومات نشاطك</h1>
          <p>يستخدم هُدهُد هذه المعلومات للإجابة عن أسئلة العملاء. كلما كانت أدق، كانت ردوده أفضل.</p>
        </div>
      </div>

      <section className="card card-pad" aria-labelledby="cm-h" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', alignItems: 'center' }}>
        <div className="grow" style={{ flex: '1 1 280px' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 id="cm-h" style={{ fontSize: 17 }}>
              اكتمال المعلومات
            </h2>
            <b className="num">
              {c.done} من {c.total}
            </b>
          </div>
          <div className="bar" style={{ marginTop: 8 }} role="progressbar" aria-label="اكتمال المعلومات" aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.done}>
            <span style={{ width: `${Math.round((c.done / c.total) * 100)}%` }} />
          </div>
        </div>
        {c.missing.length > 0 ? (
          <p className="muted" style={{ flex: '1 1 280px', fontSize: 14 }}>
            ينقص: {c.missing.join('، ')}
          </p>
        ) : (
          <p style={{ flex: '1 1 280px', fontSize: 14, color: '#0E7A4C', fontWeight: 600 }}>المعلومات مكتملة، ويستطيع هُدهُد الإجابة عن معظم الأسئلة.</p>
        )}
      </section>

      {DEFS.map((def) => {
        const filled = def.fields.filter((fd) => valueOf(fd.k).trim());
        const isEditing = editing === def.key;
        return (
          <section key={def.key} className="card" aria-labelledby={`sec-${def.key}`}>
            <div className="card-head">
              <div className="grow">
                <h2 id={`sec-${def.key}`}>{def.title}</h2>
                <span className="subtle">{filled.length ? `آخر تحديث: ${info.sectionUpdated[def.key] ? agoText(info.sectionUpdated[def.key]!, now) : agoText(info.createdAt, now)}` : 'لم تُضف بعد'}</span>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setEditing(def.key);
                    setDraft(Object.fromEntries(def.fields.map((fd) => [fd.k, valueOf(fd.k)])));
                    setTouched(false);
                  }}
                >
                  <Icon name="edit" size="sm" />
                  {filled.length ? 'تعديل' : 'إضافة'}
                </button>
              )}
            </div>
            {!isEditing ? (
              <div className="card-body" data-clarity-mask="true">
                {filled.length === 0 ? (
                  <p className="muted" style={{ fontSize: 14 }}>
                    {def.empty}
                  </p>
                ) : (
                  <dl className="kv">
                    {filled.map((fd) => (
                      <div key={fd.k} style={{ display: 'contents' }}>
                        <dt>{fd.label}</dt>
                        <dd className={fd.phone || fd.url || fd.ltr ? 'ltr' : ''} style={{ whiteSpace: 'pre-line' }}>
                          {fd.k === 'type' ? typeOf(info.type).selectLabel : valueOf(fd.k)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ) : (
              <>
                <div className="card-body col" style={{ gap: 14 }}>
                  {def.fields.map((fd) => {
                    const err = touched ? errOf(fd, draft[fd.k] ?? '') : '';
                    const cls = `input${fd.phone || fd.url || fd.ltr ? ' ltr' : ''}${err ? ' bad' : ''}`;
                    const set = (v: string) => setDraft((d) => ({ ...d, [fd.k]: v }));
                    return (
                      <div className="field" key={fd.k}>
                        <label htmlFor={`f-${fd.k}`}>
                          {fd.label}
                          {fd.req && (
                            <>
                              {' '}
                              <span className="req" aria-hidden="true">*</span>
                            </>
                          )}
                          {fd.optional && (
                            <>
                              {' '}
                              <span className="opt">(اختياري)</span>
                            </>
                          )}
                        </label>
                        {fd.select ? (
                          <select id={`f-${fd.k}`} className="input" value={draft[fd.k] ?? ''} onChange={(e) => set(e.target.value)}>
                            {BUSINESS_TYPES.map((t) => (
                              <option key={t.k} value={t.k}>
                                {t.selectLabel}
                              </option>
                            ))}
                          </select>
                        ) : fd.area ? (
                          <textarea id={`f-${fd.k}`} className={cls} value={draft[fd.k] ?? ''} onChange={(e) => set(e.target.value)} placeholder={fd.ph} />
                        ) : (
                          <input id={`f-${fd.k}`} className={cls} type={fd.type || 'text'} inputMode={(fd.mode as 'text' | 'tel' | 'url') || 'text'} value={draft[fd.k] ?? ''} onChange={(e) => set(e.target.value)} placeholder={fd.ph} />
                        )}
                        {fd.hint && <span className="hint">{fd.hint}</span>}
                        {err && <span className="err">{err}</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="card-foot">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>
                    إلغاء
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => saveSection(def)} disabled={saving}>
                    حفظ
                  </button>
                </div>
              </>
            )}
          </section>
        );
      })}

      <section className="card" aria-labelledby="hr-h">
        <div className="card-head">
          <div className="grow">
            <h2 id="hr-h">ساعات العمل</h2>
            <span className="subtle">مرتبطة بأوقات الحجز · آخر تحديث: {hoursUpdated}</span>
          </div>
          <Link className="btn btn-secondary btn-sm" href="/dashboard/bookings?tab=settings">
            تعديل من الحجوزات
          </Link>
        </div>
        <div className="card-body">
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px 24px' }}>
            {data.hours.map((h) => (
              <li key={h.weekday} className="row" style={{ justifyContent: 'space-between', borderBottom: '1px dashed #E6E9F0', padding: '6px 0' }}>
                <b style={{ fontWeight: 600 }}>{DAYS[h.weekday]}</b>
                <span className={h.open ? 'num' : 'muted'}>{h.open ? `${clock(h.openMin)} – ${clock(h.closeMin)}` : 'مغلق'}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {showDelivery && (
        <section className="card" aria-labelledby="dv-h">
          <div className="card-head">
            <div className="grow">
              <h2 id="dv-h">مناطق التوصيل ورسومه</h2>
              <span className="subtle">آخر تحديث: {delivUpdated ? agoText(delivUpdated, now) : '—'}</span>
            </div>
            <button type="button" className={deliv ? 'sw on' : 'sw'} role="switch" aria-checked={deliv} aria-label="تفعيل التوصيل" onClick={toggleDelivery} />
          </div>
          {!deliv ? (
            <div className="card-body">
              <p className="muted" style={{ fontSize: 14 }}>
                التوصيل غير مفعّل. سيخبر هُدهُد العملاء بأن الاستلام من المحل فقط.
              </p>
            </div>
          ) : (
            <>
              <div className="tbl-wrap">
                <table className="tbl stack">
                  <thead>
                    <tr>
                      <th scope="col">المنطقة</th>
                      <th scope="col">الرسوم</th>
                      <th scope="col">مدة التوصيل</th>
                      <th scope="col">
                        <span className="sr-only">إجراءات</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a, i) => (
                      <tr key={a.id ?? `n${i}`} style={{ cursor: 'default' }}>
                        <td>
                          <label className="sr-only" htmlFor={`an${i}`}>المنطقة</label>
                          <input id={`an${i}`} className={a.name.trim() ? 'input' : 'input bad'} value={a.name} onChange={(e) => upd(i, { name: e.target.value })} style={{ minWidth: 140 }} />
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`af${i}`}>الرسوم بالشيكل</label>
                          <div className="row" style={{ gap: 6 }}>
                            <input id={`af${i}`} className="input ltr" inputMode="decimal" value={a.fee} onChange={(e) => upd(i, { fee: e.target.value.replace(/[^\d.]/g, '') })} style={{ width: 80 }} />
                            <span className="muted">₪</span>
                          </div>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`at${i}`}>مدة التوصيل</label>
                          <select id={`at${i}`} className="input" value={a.eta} onChange={(e) => upd(i, { eta: e.target.value })} style={{ minWidth: 150 }}>
                            {ETA_OPTIONS.map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          <button type="button" className="ib sm danger" onClick={() => setRows((r) => r.filter((_, k) => k !== i))} aria-label={`حذف منطقة ${a.name || 'جديدة'}`}>
                            <Icon name="trash" size="sm" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-body row" style={{ flexWrap: 'wrap', gap: 12, borderTop: '1px solid #E6E9F0' }}>
                <button type="button" className="btn btn-soft btn-sm" onClick={() => setRows((r) => [...r, { name: '', fee: '20', eta: 'يوم عمل واحد' }])}>
                  + إضافة منطقة
                </button>
                <span className="grow" />
                <label className="row" style={{ gap: 8, fontSize: 14 }} htmlFor="free-over">
                  توصيل مجاني للطلبات فوق
                  <input id="free-over" className="input ltr" inputMode="decimal" value={freeOver} onChange={(e) => setFreeOver(e.target.value.replace(/[^\d.]/g, ''))} style={{ width: 90 }} />₪
                </label>
              </div>
              {areasDirty && (
                <div className="card-foot">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setRows(saved.map((a) => ({ ...a })));
                      setFreeOver(savedFree);
                    }}
                  >
                    إلغاء
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={saveAreas} disabled={saving}>
                    حفظ مناطق التوصيل
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <section className="card" aria-labelledby="ru-h">
        <div className="card-head">
          <div className="grow">
            <h2 id="ru-h">قواعد أخرى</h2>
            <span className="subtle">معلومات خاصة بنشاطك يجب أن يعرفها هُدهُد</span>
          </div>
        </div>
        <ul>
          {rules.map((r, i) => (
            <li key={i} className="row" style={{ gap: 10, padding: '10px 20px', borderTop: '1px solid #E6E9F0' }}>
              <Icon name="check" size="sm" style={{ color: '#0B7F58' }} />
              <span className="grow">{r}</span>
              <button
                type="button"
                className="ib sm danger"
                onClick={() =>
                  putRules(rules.filter((_, k) => k !== i))
                }
                aria-label={`حذف القاعدة: ${r}`}
              >
                <Icon name="close" size="sm" />
              </button>
            </li>
          ))}
          {rules.length === 0 && (
            <li className="muted" style={{ padding: '12px 20px', borderTop: '1px solid #E6E9F0', fontSize: 14 }}>
              لا توجد قواعد بعد.
            </li>
          )}
        </ul>
        <div className="card-foot" style={{ justifyContent: 'stretch' }}>
          <label htmlFor="new-rule" className="sr-only">
            قاعدة جديدة
          </label>
          <input id="new-rule" className={ruleErr ? 'input bad' : 'input'} value={newRule} onChange={(e) => (setNewRule(e.target.value), setRuleErr(false))} placeholder="مثلاً: لا نستقبل حجوزات لنفس اليوم بعد الساعة 6 مساءً" style={{ flex: '1 1 260px' }} />
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => {
              if (!newRule.trim()) {
                setRuleErr(true);
                return;
              }
              putRules([...rules, newRule.trim()], 'تمت إضافة القاعدة');
              setNewRule('');
            }}
          >
            إضافة
          </button>
        </div>
      </section>
    </main>
  );
}
