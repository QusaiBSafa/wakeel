'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/components/app/Store';
import Switch from '@/components/ui/Switch';
import { LogoPicker } from '@/components/app/PhotoPicker';
import { CATEGORIES, DAYS, PAYMENT_METHODS, type Category } from '@/lib/constants';
import { dayHours } from '@/lib/slots';
import { infoChecks } from '@/lib/readiness';
import { PHONE_RE } from '@/lib/validation';
import { parsePriceToMinor } from '@/lib/money';
import type { BusinessDTO } from '@/lib/types';

const urlOk = (v: string) => !v.trim() || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v.trim());
const phoneOk = (v: string) => !v.trim() || PHONE_RE.test(v.trim());
const feeOk = (v: string) => !v.trim() || v.trim() === '0' || parsePriceToMinor(v) !== null;

export default function InfoPage() {
  const { state, queueBusiness } = useStore();
  const b = state.business;
  // fields that are currently invalid are kept here (shown with errors, not saved)
  const [draft, setDraft] = useState<{ name?: string; phone?: string; mapUrl?: string; website?: string; fee?: string }>({});

  const checks = infoChecks(state);
  const infoDone = checks.filter((c) => c[1]).length;
  const missing = checks.filter((c) => !c[1]).map((c) => c[0]);

  const name = draft.name ?? b.name;
  const phone = draft.phone ?? b.phone;
  const mapUrl = draft.mapUrl ?? b.mapUrl;
  const website = draft.website ?? b.socials.website;
  const fee = draft.fee ?? b.delivery.fee;

  /** Validate-then-save for fields with format rules. */
  const guarded = (key: keyof typeof draft, value: string, ok: boolean, save: () => void) => {
    if (ok) {
      setDraft((d) => {
        const n = { ...d };
        delete n[key];
        return n;
      });
      save();
    } else setDraft((d) => ({ ...d, [key]: value }));
  };

  const setField = <K extends keyof BusinessDTO>(k: K, v: BusinessDTO[K]) => queueBusiness({ [k]: v } as never);
  const setSocial = (k: keyof BusinessDTO['socials'], v: string) => queueBusiness({ socials: { [k]: v } });
  const setDelivery = (patch: Partial<BusinessDTO['delivery']>) => queueBusiness({ delivery: patch });

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>معلومات عامة</h1>
          <p className="muted">كل إشي هون هُدهُد بستعمله ليجاوب زباينك. التغييرات بتنحفظ لحالها.</p>
        </div>
        <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
            <span>اكتمال الملف</span>
            <span>{infoDone} من 8</span>
          </div>
          <div className="bar">
            <span style={{ width: `${Math.round((infoDone / 8) * 100)}%` }} />
          </div>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="alert info" style={{ fontSize: 15 }}>
          ناقص: {missing.join('، ')}
        </div>
      )}

      <div data-clarity-mask="true" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section className="card" aria-labelledby="gi-h" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 id="gi-h" style={{ fontSize: 19, fontWeight: 800 }}>
            المعلومات العامة
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
            <LogoPicker url={b.logoUrl} initial={(b.name || 'م').charAt(0)} onUploaded={(u) => queueBusiness({ logo: u })} />
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
              <div className="two">
                <div className="field">
                  <label htmlFor="bi-name">
                    اسم الشركة <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="bi-name"
                    className={name.trim() ? 'input' : 'input bad'}
                    value={name}
                    maxLength={80}
                    aria-required="true"
                    aria-invalid={!name.trim()}
                    onChange={(e) => guarded('name', e.target.value, !!e.target.value.trim(), () => setField('name', e.target.value))}
                  />
                  {!name.trim() && <div className="err">اسم الشركة مطلوب</div>}
                </div>
                <div className="field">
                  <label htmlFor="bi-cat">نوع الشركة</label>
                  <select id="bi-cat" className="input" value={b.category} onChange={(e) => setField('category', e.target.value as Category)}>
                    {CATEGORIES.map((c) => (
                      <option key={c.k} value={c.k}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="bi-desc">وصف قصير</label>
                <textarea
                  id="bi-desc"
                  className="input"
                  value={b.description}
                  onChange={(e) => setField('description', e.target.value.slice(0, 500))}
                  placeholder="شو بتقدّم؟ شو بميّزك؟ جملتين بكفوا."
                  aria-describedby="bi-desc-c"
                />
                <span id="bi-desc-c" className="hint">
                  {b.description.length} / 500
                </span>
              </div>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="bi-phone">رقم التواصل</label>
              <input
                id="bi-phone"
                className={phoneOk(phone) ? 'input ltr' : 'input ltr bad'}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                maxLength={30}
                aria-invalid={!phoneOk(phone)}
                onChange={(e) => guarded('phone', e.target.value, phoneOk(e.target.value), () => setField('phone', e.target.value))}
                placeholder="0599 123 456"
              />
              {!phoneOk(phone) && <div className="err">رقم الهاتف مش صحيح</div>}
            </div>
            <div className="field">
              <label htmlFor="bi-addr">العنوان</label>
              <input id="bi-addr" className="input" value={b.address} maxLength={200} onChange={(e) => setField('address', e.target.value)} placeholder="المدينة، الشارع، معلم قريب" />
            </div>
            <div className="field">
              <label htmlFor="bi-map">
                رابط الخريطة <span className="opt">(اختياري)</span>
              </label>
              <input
                id="bi-map"
                className={urlOk(mapUrl) ? 'input ltr' : 'input ltr bad'}
                type="url"
                inputMode="url"
                dir="ltr"
                value={mapUrl}
                maxLength={300}
                aria-invalid={!urlOk(mapUrl)}
                onChange={(e) => guarded('mapUrl', e.target.value, urlOk(e.target.value), () => setField('mapUrl', e.target.value))}
                placeholder="https://maps.google.com/…"
              />
              {!urlOk(mapUrl) && <div className="err">الرابط لازم يبلّش بـ https://</div>}
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="hr-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 id="hr-h" style={{ fontSize: 19, fontWeight: 800 }}>
            ساعات العمل
          </h2>
          <div role="radiogroup" aria-labelledby="hr-h" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <label className={b.hoursMode === 'booking' ? 'check on' : 'check'}>
              <input type="radio" name="hours" checked={b.hoursMode === 'booking'} onChange={() => setField('hoursMode', 'booking')} />
              نفس أوقات الحجز
            </label>
            <label className={b.hoursMode === 'custom' ? 'check on' : 'check'}>
              <input type="radio" name="hours" checked={b.hoursMode === 'custom'} onChange={() => setField('hoursMode', 'custom')} />
              أوقات مختلفة
            </label>
          </div>
          {b.hoursMode === 'booking' ? (
            <>
              <div style={{ background: '#F7F8F4', borderRadius: 14, padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: 15 }}>
                {state.booking.days.map((d, i) => (
                  <span key={DAYS[i]} style={{ display: 'contents' }}>
                    <span style={{ fontWeight: 700 }}>{DAYS[i]}</span>
                    <span className="muted">{dayHours(d)}</span>
                  </span>
                ))}
              </div>
              <Link href="/dashboard/booking" className="tap" style={{ fontSize: 14, alignSelf: 'flex-start' }}>
                عدّل الأوقات من صفحة المواعيد
              </Link>
            </>
          ) : (
            <div className="field">
              <label htmlFor="bi-hours">اكتب ساعات العمل</label>
              <textarea
                id="bi-hours"
                className="input"
                value={b.hoursText}
                maxLength={500}
                onChange={(e) => setField('hoursText', e.target.value)}
                placeholder="مثلاً: السبت للخميس من 9 الصبح لـ 6 المسا، الجمعة مسكّر"
              />
            </div>
          )}
        </section>

        <div className="two">
          <section className="card" aria-labelledby="so-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 id="so-h" style={{ fontSize: 19, fontWeight: 800 }}>
              حسابات التواصل الاجتماعي
            </h2>
            <div className="field">
              <label htmlFor="bi-ig">إنستغرام</label>
              <input id="bi-ig" className="input ltr" dir="ltr" autoCapitalize="none" value={b.socials.instagram} maxLength={120} onChange={(e) => setSocial('instagram', e.target.value)} placeholder="@username" />
            </div>
            <div className="field">
              <label htmlFor="bi-fb">فيسبوك</label>
              <input id="bi-fb" className="input ltr" dir="ltr" autoCapitalize="none" value={b.socials.facebook} maxLength={120} onChange={(e) => setSocial('facebook', e.target.value)} placeholder="facebook.com/…" />
            </div>
            <div className="field">
              <label htmlFor="bi-tt">تيك توك</label>
              <input id="bi-tt" className="input ltr" dir="ltr" autoCapitalize="none" value={b.socials.tiktok} maxLength={120} onChange={(e) => setSocial('tiktok', e.target.value)} placeholder="@username" />
            </div>
            <div className="field">
              <label htmlFor="bi-web">الموقع الإلكتروني</label>
              <input
                id="bi-web"
                className={urlOk(website) ? 'input ltr' : 'input ltr bad'}
                type="url"
                inputMode="url"
                dir="ltr"
                value={website}
                maxLength={300}
                aria-invalid={!urlOk(website)}
                onChange={(e) => guarded('website', e.target.value, urlOk(e.target.value), () => setSocial('website', e.target.value))}
                placeholder="https://"
              />
              {!urlOk(website) && <div className="err">الرابط لازم يبلّش بـ https://</div>}
            </div>
          </section>

          <section className="card" aria-labelledby="pay-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h2 id="pay-h" style={{ fontSize: 19, fontWeight: 800 }}>
              الدفع والتوصيل
            </h2>
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <legend className="lbl" style={{ marginBottom: 8 }}>
                طرق الدفع
              </legend>
              {PAYMENT_METHODS.map((o) => {
                const on = b.paymentMethods.includes(o.k);
                return (
                  <label key={o.k} className={on ? 'check on' : 'check'}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setField('paymentMethods', on ? b.paymentMethods.filter((x) => x !== o.k) : [...b.paymentMethods, o.k])}
                    />
                    {o.label}
                  </label>
                );
              })}
            </fieldset>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTop: '1px solid #E6E9F0', paddingTop: 14 }}>
              <span className="lbl" id="dl-l">
                في توصيل؟
              </span>
              <Switch on={b.delivery.enabled} onToggle={() => setDelivery({ enabled: !b.delivery.enabled })} labelledBy="dl-l" />
            </div>
            {b.delivery.enabled && (
              <>
                <div className="field">
                  <label htmlFor="dl-area">مناطق التوصيل</label>
                  <input id="dl-area" className="input" value={b.delivery.areas} maxLength={200} onChange={(e) => setDelivery({ areas: e.target.value })} placeholder="مثلاً: رام الله والبيرة" />
                </div>
                <div className="two" style={{ gap: 12 }}>
                  <div className="field">
                    <label htmlFor="dl-fee">رسوم التوصيل (₪)</label>
                    <input
                      id="dl-fee"
                      className={feeOk(fee) ? 'input' : 'input bad'}
                      inputMode="decimal"
                      dir="ltr"
                      value={fee}
                      maxLength={12}
                      aria-invalid={!feeOk(fee)}
                      onChange={(e) => guarded('fee', e.target.value, feeOk(e.target.value), () => setDelivery({ fee: e.target.value }))}
                      placeholder="15"
                    />
                    {!feeOk(fee) && <div className="err">اكتب رقم صحيح</div>}
                  </div>
                  <div className="field">
                    <label htmlFor="dl-time">مدة التوصيل</label>
                    <input id="dl-time" className="input" value={b.delivery.time} maxLength={80} onChange={(e) => setDelivery({ time: e.target.value })} placeholder="نفس اليوم" />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
