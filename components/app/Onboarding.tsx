'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import Switch from '@/components/ui/Switch';
import { Icon, WhatsAppLogo, WhatsAppTile } from '@/components/ui/icons';
import { useStore } from './Store';
import ToastView from './ToastView';
import WaModal from './WaModal';
import { PhotoTile, photoFrom, type PhotoValue } from './PhotoPicker';
import { CATEGORIES, DAYS, SLOT_OPTIONS } from '@/lib/constants';
import { parsePriceToMinor, priceLabel } from '@/lib/money';
import { PHONE_RE } from '@/lib/validation';
import { api } from '@/lib/client/api';
import type { AppState, ProductDTO } from '@/lib/types';

const LABELS = ['الشركة', 'المنتجات', 'المواعيد', 'واتساب'];

export default function Onboarding({ hasBusiness }: { hasBusiness: boolean }) {
  const router = useRouter();
  const { state, setState, showToast, openWa } = useStore();
  const [created, setCreated] = useState(hasBusiness);
  const [step, setStep] = useState(Math.min(hasBusiness ? Math.max(state.business.onboardingStep, 1) : 0, 3));
  const [busy, setBusy] = useState(false);

  // step 1
  const [name, setName] = useState(state.business.name);
  const [cat, setCat] = useState(state.business.category);
  const [phone, setPhone] = useState(state.business.phone);
  const [touched, setTouched] = useState(false);

  // step 2
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pTouched, setPTouched] = useState(false);
  const [photo, setPhoto] = useState<PhotoValue>(photoFrom(null));
  const [adding, setAdding] = useState(false);

  // step 3 (defaults suggested for a new account)
  const initialBooking = created && state.booking.enabled ? state.booking : { ...state.booking, enabled: true, days: state.booking.days.map((d, i) => ({ on: i !== 6, ranges: [{ s: '10:00', e: '20:00' }] })) };
  const [booking, setBooking] = useState(initialBooking);
  const [from, setFrom] = useState(initialBooking.days.find((d) => d.on)?.ranges[0].s ?? '10:00');
  const [to, setTo] = useState(initialBooking.days.find((d) => d.on)?.ranges[0].e ?? '20:00');

  const nameErr = touched && !name.trim();
  const phoneBad = !!phone.trim() && !PHONE_RE.test(phone.trim());
  const priceN = parsePriceToMinor(pPrice);
  const priceErr = pTouched && priceN === null ? 'اكتب سعر صحيح' : '';
  const rangeBad = from >= to;

  const saveStep = (n: number) => api('PATCH', '/api/app/business', { onboardingStep: n }).catch(() => {});

  const finish = async (skipped: boolean) => {
    setBusy(true);
    try {
      if (!created) {
        // skipping from the first step still needs a name for the business
        if (!name.trim()) {
          setTouched(true);
          setStep(0);
          return;
        }
        await createBusiness();
      }
      await api('PATCH', '/api/app/business', { onboarded: true, onboardingStep: 4 });
      router.replace(skipped ? '/dashboard?welcome=skip' : '/dashboard?welcome=1');
      router.refresh();
    } catch {
      showToast('ما قدرنا نحفظ، جرّب كمان مرة');
    } finally {
      setBusy(false);
    }
  };

  const createBusiness = async () => {
    const s = await api<AppState>('POST', '/api/app/business', { name: name.trim(), category: cat, phone: phone.trim() });
    setState(s);
    setCreated(true);
    return s;
  };

  const next = async () => {
    if (busy) return;
    if (step === 0) {
      if (!name.trim() || phoneBad) {
        setTouched(true);
        return;
      }
      setBusy(true);
      try {
        await createBusiness();
        setStep(1);
      } catch {
        showToast('ما قدرنا نحفظ معلومات الشركة، جرّب كمان مرة');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 2) {
      if (booking.enabled && rangeBad) return;
      setBusy(true);
      try {
        await api('PUT', '/api/app/booking', booking);
        setState((s) => ({ ...s, booking }));
        await saveStep(3);
        setStep(3);
      } catch {
        showToast('ما قدرنا نحفظ المواعيد، جرّب كمان مرة');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === 3) return finish(false);
    await saveStep(step + 1);
    setStep(step + 1);
  };

  const addProduct = async () => {
    if (!pName.trim() || priceN === null) {
      setPTouched(true);
      if (!pName.trim()) showToast('اكتب اسم المنتج أول');
      return;
    }
    setAdding(true);
    try {
      const p = await api<ProductDTO>('POST', '/api/app/products', { name: pName.trim(), price: pPrice, currency: 'ILS', ...(photo.upload ? { image: photo.upload } : {}) });
      setState((s) => ({ ...s, products: [p, ...s.products] }));
      setPName('');
      setPPrice('');
      setPTouched(false);
      setPhoto(photoFrom(null));
    } catch {
      showToast('ما قدرنا نضيف المنتج، جرّب كمان مرة');
    } finally {
      setAdding(false);
    }
  };

  const setRange = (s: string, e: string) => {
    setFrom(s);
    setTo(e);
    setBooking((b) => ({ ...b, days: b.days.map((d) => ({ ...d, ranges: [{ s, e }] })) }));
  };

  return (
    <>
      <div className="top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800 }}>
          <Logo size={26} />
          هُدهُد
        </div>
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-text" onClick={() => finish(true)} disabled={busy}>
          تخطّى الآن وكمّل بعدين
        </button>
      </div>

      <main style={{ flex: 1, width: '100%', maxWidth: 760, margin: '0 auto', padding: '28px 16px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="tag">خطوة {step + 1} من 4</span>
            <span className="hint">بتقدر ترجع لأي خطوة بعدين من لوحة التحكم</span>
          </div>
          <div className="bar" role="progressbar" aria-label="تقدّم الإعداد" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step + 1}>
            <span style={{ width: `${(step + 1) * 25}%` }} />
          </div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
            {LABELS.map((l, i) => (
              <li key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }} aria-current={i === step ? 'step' : undefined}>
                <span className={i < step ? 'step-dot done' : i === step ? 'step-dot cur' : 'step-dot'} aria-hidden="true">
                  {i < step ? '✓' : i + 1}
                </span>
                <span>{l}</span>
              </li>
            ))}
          </ol>
        </div>

        {step === 0 && (
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="ob0-h" data-clarity-mask="true">
            <div>
              <h1 id="ob0-h" style={{ fontSize: 24, fontWeight: 800 }}>
                عرّف هُدهُد على شركتك
              </h1>
              <p className="muted">معلومتين بس هلأ، والباقي بتكمّله بوقتك.</p>
            </div>
            <div className="field">
              <label htmlFor="ob-name">
                اسم الشركة <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                id="ob-name"
                className={nameErr ? 'input bad' : 'input'}
                value={name}
                maxLength={80}
                autoComplete="organization"
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: صالون لمسة"
                aria-required="true"
                aria-invalid={nameErr}
                aria-describedby={nameErr ? 'ob-name-e' : undefined}
              />
              {nameErr && (
                <div id="ob-name-e" className="err">
                  اكتب اسم الشركة عشان نكمّل
                </div>
              )}
            </div>
            <div className="field">
              <span className="lbl" id="ob-cat-l">
                شو نوع الشركة؟
              </span>
              <div role="radiogroup" aria-labelledby="ob-cat-l" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map((c) => (
                  <button key={c.k} type="button" className={cat === c.k ? 'chip on' : 'chip'} role="radio" aria-checked={cat === c.k} onClick={() => setCat(c.k)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="hint">منختارلك الأسئلة الشائعة والإعدادات حسب نوع شركتك.</div>
            </div>
            <div className="field">
              <label htmlFor="ob-phone">
                رقم التواصل <span className="opt">(اختياري)</span>
              </label>
              <input
                id="ob-phone"
                className={touched && phoneBad ? 'input ltr bad' : 'input ltr'}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                maxLength={30}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0599 123 456"
              />
              {touched && phoneBad && <div className="err">رقم الهاتف مش صحيح</div>}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="ob1-h" data-clarity-mask="true">
            <div>
              <h1 id="ob1-h" style={{ fontSize: 24, fontWeight: 800 }}>
                أضف أول منتج أو خدمة
              </h1>
              <p className="muted">هُدهُد بستعمل الأسعار هاي ليرد على «قديش سعر…؟». ما عندك منتجات؟ تخطّى الخطوة.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
              <div style={{ flex: '1 1 180px' }}>
                <PhotoTile value={photo} onChange={setPhoto} />
              </div>
              <div style={{ flex: '2 1 260px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label htmlFor="ob-pn">الاسم</label>
                  <input id="ob-pn" className="input" value={pName} maxLength={80} onChange={(e) => setPName(e.target.value)} placeholder="مثلاً: قص وسشوار" />
                </div>
                <div className="field">
                  <label htmlFor="ob-pp">السعر (₪)</label>
                  <input
                    id="ob-pp"
                    className={priceErr ? 'input bad' : 'input'}
                    inputMode="decimal"
                    dir="ltr"
                    value={pPrice}
                    maxLength={12}
                    onChange={(e) => setPPrice(e.target.value)}
                    placeholder="70"
                    aria-invalid={!!priceErr}
                  />
                  {priceErr && <div className="err">{priceErr}</div>}
                </div>
                <button type="button" className="btn btn-soft" onClick={addProduct} disabled={adding}>
                  {adding ? <span className="spin dark" /> : <Icon name="plus" />}
                  أضف للقائمة
                </button>
              </div>
            </div>
            {state.products.length > 0 && (
              <div>
                <div className="lbl" style={{ marginBottom: 8 }}>
                  منتجاتك ({state.products.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {state.products.slice(0, 8).map((p) => (
                    <span key={p.id} className="tag gray">
                      {p.name} · {priceLabel(p.priceMinor, p.currency)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }} aria-labelledby="ob2-h">
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <h1 id="ob2-h" style={{ fontSize: 24, fontWeight: 800 }}>
                  بدك هُدهُد يحجز مواعيد؟
                </h1>
                <p className="muted">لو شغلك بالمواعيد، هُدهُد بعرض الأوقات الفاضية وبحجزها للزبون.</p>
              </div>
              <Switch on={booking.enabled} onToggle={() => setBooking((b) => ({ ...b, enabled: !b.enabled }))} label="استقبال الحجوزات" />
            </div>
            {booking.enabled ? (
              <>
                <div className="field">
                  <span className="lbl" id="ob-days">
                    أيام الدوام
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="group" aria-labelledby="ob-days">
                    {DAYS.map((d, i) => {
                      const on = booking.days[i].on;
                      return (
                        <button
                          key={d}
                          type="button"
                          className={on ? 'chip on' : 'chip'}
                          aria-pressed={on}
                          onClick={() => setBooking((b) => ({ ...b, days: b.days.map((x, k) => (k === i ? { ...x, on: !x.on } : x)) }))}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  <div className="field" style={{ flex: '1 1 140px' }}>
                    <label htmlFor="ob-from">من الساعة</label>
                    <input id="ob-from" className={rangeBad ? 'input bad' : 'input'} type="time" value={from} onChange={(e) => setRange(e.target.value, to)} />
                  </div>
                  <div className="field" style={{ flex: '1 1 140px' }}>
                    <label htmlFor="ob-to">لحد الساعة</label>
                    <input id="ob-to" className={rangeBad ? 'input bad' : 'input'} type="time" value={to} onChange={(e) => setRange(from, e.target.value)} />
                  </div>
                </div>
                {rangeBad && (
                  <div className="err" role="alert">
                    وقت النهاية لازم يكون بعد البداية
                  </div>
                )}
                <div className="field">
                  <span className="lbl" id="ob-slot">
                    مدة الموعد
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="radiogroup" aria-labelledby="ob-slot">
                    {SLOT_OPTIONS.slice(0, 4).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        className={String(booking.slotMinutes) === k ? 'chip on' : 'chip'}
                        role="radio"
                        aria-checked={String(booking.slotMinutes) === k}
                        onClick={() => setBooking((b) => ({ ...b, slotMinutes: Number(k) }))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="hint">فترات متعددة باليوم، إجازات، وفاصل بين المواعيد؟ كلها موجودة بصفحة المواعيد.</p>
              </>
            ) : (
              <div className="alert info">ما في مشكلة. هُدهُد رح يجاوب الأسئلة ويستقبل الطلبات بدون حجز مواعيد، وبتقدر تفعّل الحجز بأي وقت.</div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }} aria-labelledby="ob3-h">
            <WhatsAppTile size={64} />
            <div>
              <h1 id="ob3-h" style={{ fontSize: 24, fontWeight: 800 }}>
                آخر خطوة: اربط واتساب
              </h1>
              <p className="muted">لما تربط رقمك، هُدهُد بصير يرد على زباينك من المعلومات اللي عبّيتها.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={openWa}>
              <WhatsAppLogo />
              اربط واتساب
            </button>
          </section>
        )}

        <div className="ob-actions">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={busy}>
              <Icon name="back" />
              رجوع
            </button>
          )}
          <span className="ob-spacer" style={{ flex: 1 }} />
          {(step === 1 || step === 2) && (
            <button
              type="button"
              className="btn btn-text"
              disabled={busy}
              onClick={async () => {
                await saveStep(step + 1);
                setStep(step + 1);
              }}
            >
              تخطّى هالخطوة
            </button>
          )}
          <button type="button" className="btn btn-primary ob-next" onClick={next} disabled={busy}>
            {busy && <span className="spin" />}
            {step === 3 ? 'روح للوحة التحكم' : 'التالي'}
            <Icon name="next" />
          </button>
        </div>
      </main>
      <WaModal />
      <ToastView />
    </>
  );
}
