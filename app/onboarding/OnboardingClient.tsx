'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StepCatalog, StepDelivery, StepFaq, StepHours, StepInfo, StepType } from '@/components/onboarding/Steps';
import type { OnbRow, OnbState } from '@/components/onboarding/types';
import WhatsAppConnect from '@/components/onboarding/WhatsAppConnect';
import { Icon } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { onboardingAnswer } from '@/lib/client/test-chat';
import { CITIES, DEFAULT_ZONES, typeOf } from '@/lib/constants';
import { parsePriceToMinor } from '@/lib/money';
import { doneCount, generatedFaqs, hoursSentence, stepDone, type StepCtx } from '@/lib/onboarding';
import { hhmm } from '@/lib/time';
import { minorToInput } from '@/lib/money';
import type { OnboardingData } from '@/lib/server/loaders/onboarding';
import { PHONE_RE } from '@/lib/format';

const STEPS: [string, string, string][] = [
  ['نوع النشاط', 'ما نوع نشاطك؟', 'نجهّز لك الخطوات والأسئلة المناسبة لنشاطك.'],
  ['معلومات النشاط', 'عرّفنا بنشاطك', 'يستخدم هُدهُد هذه المعلومات عند الحديث مع عملائك.'],
  ['أوقات العمل', 'متى تعمل؟', 'لن يحجز هُدهُد مواعيد خارج هذه الأوقات، وسيخبر العملاء بها عند السؤال.'],
  ['المنتجات والخدمات', 'ماذا تقدّم؟', 'يجيب هُدهُد عن الأسعار من هذه القائمة فقط، ولا يخترع أسعاراً.'],
  ['التوصيل', 'إلى أين توصل؟', 'يحسب هُدهُد رسوم التوصيل ويخبر بها العميل قبل تأكيد الطلب.'],
  ['الأسئلة الشائعة', 'أسئلة يطرحها عملاؤك كثيراً', 'اختر الأسئلة التي تنطبق على نشاطك وراجع أجوبتها.'],
  ['ربط واتساب', 'اربط رقم واتساب للأعمال', 'يستغرق الربط نحو 5 دقائق عبر حسابك في Meta.'],
  ['التجربة والتفعيل', 'جرّب هُدهُد ثم فعّله', 'راجع الملخص وجرّب بعض الأسئلة، ثم فعّل الردود التلقائية.'],
];

type Biz = NonNullable<OnboardingData['business']>;
type Mode = 'wizard' | 'resume' | 'live';

function initial(b: Biz | null): OnbState {
  const offers = b?.info.offers ?? { products: true, services: false, delivery: false };
  const hours =
    b && b.hours.length === 7
      ? b.hours.map((h) => ({ on: h.open, from: hhmm(h.openMin), to: hhmm(h.closeMin) }))
      : Array.from({ length: 7 }, (_, i) => ({ on: i < 6, from: '09:00', to: '19:00' }));
  const ids = new Set(b?.onboarding.rowIds ?? []);
  const rows: OnbRow[] = (b?.catalog ?? [])
    .filter((c) => ids.has(c.id))
    .map((c) => ({ id: c.id, kind: c.kind === 'service' ? ('service' as const) : ('product' as const), name: c.name, price: minorToInput(c.priceMinor), dur: String(c.durationMin ?? 60) }));
  if (!rows.length) {
    if (offers.services) rows.push({ kind: 'service', name: '', price: '', dur: '60' });
    if (offers.products) rows.push({ kind: 'product', name: '', price: '', dur: '' });
  }
  const stored = b?.zones ?? [];
  const zones = DEFAULT_ZONES.map((z) => {
    const s = stored.find((x) => x.name === z.name);
    return s ? { name: z.name, on: true, fee: minorToInput(s.feeMinor) } : stored.length ? { ...z, on: false } : { ...z };
  });
  for (const s of stored) if (!zones.some((z) => z.name === s.name)) zones.push({ name: s.name, on: true, fee: minorToInput(s.feeMinor) });
  const info = b?.info;
  return {
    type: info ? info.type : '',
    offers,
    f: { name: info?.name ?? '', city: info?.city || CITIES[0], phone: info?.phone ?? '', addr: info?.address ?? '', desc: info?.description ?? '' },
    hours,
    rows,
    zones,
    freeOver: stored.length ? minorToInput(info?.freeOverMinor ?? 0) : '200',
    faqs: null,
    chat: [],
  };
}

export default function OnboardingClient({ business, firstName }: { business: Biz | null; firstName: string }) {
  const router = useRouter();
  const toast = useToast();
  const ob = business?.onboarding;
  const [mode, setMode] = useState<Mode>(business && ob!.maxStep > 1 ? 'resume' : 'wizard');
  const [step, setStep] = useState(Math.max(1, Math.min(8, ob?.step ?? 1)));
  const [maxStep, setMaxStep] = useState(ob?.maxStep ?? 1);
  const [skipped, setSkipped] = useState<number[]>(ob?.skipped ?? []);
  const [s, setS] = useState<OnbState>(() => initial(business));
  const [waPhone, setWaPhone] = useState<string | null>(business?.wa?.status === 'connected' ? business.wa.phone : null);
  const [hasBusiness, setHasBusiness] = useState(!!business);
  const [touched, setTouched] = useState(false);
  const [typeErr, setTypeErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [livePhone, setLivePhone] = useState('');

  const deliv = s.offers.delivery;
  const ctx: StepCtx = { maxStep, skipped, waConnected: !!waPhone, delivery: deliv, activated: false };
  const done = doneCount(ctx);
  const pct = Math.round((done / 8) * 100);
  const faqRows = s.faqs ?? generatedFaqs(s.type || 'other', { hours: s.hours, city: s.f.city, address: s.f.addr });
  const set = (p: Partial<OnbState>) => setS((x) => ({ ...x, ...p }));

  const rowsToSend = () => s.rows.filter((r) => r.name.trim());
  function payload(n: number): Record<string, unknown> {
    switch (n) {
      case 1:
        return { type: s.type, offers: s.offers };
      case 2:
        return { name: s.f.name, city: s.f.city, phone: s.f.phone.trim(), address: s.f.addr, description: s.f.desc };
      case 3:
        return { hours: s.hours.map((h) => ({ open: h.on, from: h.from, to: h.to })) };
      case 4:
        return { rows: rowsToSend().map((r) => ({ ...(r.id ? { id: r.id } : {}), kind: r.kind, name: r.name, price: r.price, ...(r.kind === 'service' ? { durationMin: Number(r.dur) || 60 } : {}) })) };
      case 5:
        return { zones: s.zones.map((z) => ({ name: z.name, on: z.on, fee: z.fee })), freeOver: s.freeOver.trim() || null };
      case 6:
        return { faqs: faqRows.map((f) => ({ key: f.key, question: f.q, answer: f.a, on: f.on })) };
      default:
        return {};
    }
  }

  /** Validation the prototype does on «التالي». */
  function valid(n: number): boolean {
    if (n === 1 && !s.type) {
      setTypeErr(true);
      return false;
    }
    if (n === 2 && (!s.f.name.trim() || !PHONE_RE.test(s.f.phone.trim()))) {
      setTouched(true);
      return false;
    }
    if (n === 4 && rowsToSend().some((r) => parsePriceToMinor(r.price) === null)) {
      toast('اكتب سعراً صحيحاً أكبر من صفر لكل سطر', { kind: 'bad' });
      return false;
    }
    if (n === 6 && faqRows.some((f) => f.on && !f.a.trim())) {
      setTouched(true);
      return false;
    }
    return true;
  }

  async function save(n: number, o: { skipped?: boolean; draft?: boolean }): Promise<boolean> {
    if (n === 1 && !s.type) return false;
    if (n > 1 && !hasBusiness) return false;
    try {
      const r = await api<{ rowIds?: string[] }>('PUT', `/api/app/onboarding/step/${n}`, { data: o.skipped ? {} : payload(n), ...(o.skipped ? { skipped: true } : {}), ...(o.draft ? { draft: true } : {}) });
      setHasBusiness(true);
      if (n === 4 && r.rowIds && !o.skipped) {
        // ids come back in the order the named rows were sent
        let k = 0;
        setS((x) => ({ ...x, rows: x.rows.map((row) => (row.name.trim() ? { ...row, id: r.rowIds![k++] } : row)) }));
      }
      return true;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
      return false;
    }
  }

  const goTo = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setTouched(false);
    setTypeErr(false);
  };

  /** Leaving a step through the side list or «السابق» keeps what was typed (saved as a draft). */
  async function navigate(n: number) {
    setSaving(true);
    const ok = step === 8 ? true : (await save(step, { draft: true })) || (step === 1 && !s.type) || !hasBusiness;
    setSaving(false);
    if (ok) {
      setStep(n);
      setTouched(false);
      setTypeErr(false);
    }
  }

  async function next() {
    if (step === 8) return activate();
    if (!valid(step)) return;
    setSaving(true);
    const ok = await save(step, {});
    setSaving(false);
    if (!ok) return;
    setSkipped((k) => k.filter((x) => x !== step));
    goTo(step + 1);
  }

  async function skip() {
    setSaving(true);
    const ok = await save(step, { skipped: true });
    setSaving(false);
    if (!ok) return;
    setSkipped((k) => [...new Set([...k, step])]);
    goTo(step + 1);
  }

  async function saveLater() {
    if (!hasBusiness && !s.type) {
      setTypeErr(true);
      return;
    }
    setSaving(true);
    const ok = await save(step, { draft: true });
    setSaving(false);
    if (!ok) return;
    toast('حُفظ تقدّمك. يمكنك المتابعة في أي وقت');
    router.push('/dashboard');
  }

  async function activate() {
    if (!waPhone) {
      setTouched(true);
      return;
    }
    setSaving(true);
    try {
      const r = await api<{ phone: string }>('POST', '/api/app/onboarding/activate');
      setLivePhone(r.phone);
      setMode('live');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSaving(false);
    }
  }

  // ---------- test chat (client only, never sent anywhere) ----------
  const first = s.rows.find((r) => r.name.trim() && parsePriceToMinor(r.price) !== null);
  const chatCtx = {
    hoursText: hoursSentence(s.hours),
    item: first ? { name: first.name, priceMinor: parsePriceToMinor(first.price)!, durationMin: first.kind === 'service' ? Number(first.dur) || null : null } : null,
    hasBookings: s.offers.services,
  };
  const tests = ['ما هي أوقات العمل؟', first ? `كم سعر ${first.name}؟` : 'كم الأسعار؟', s.offers.services ? 'أريد حجز موعد غداً' : 'أريد أن أطلب'];
  const ask = (text: string) => set({ chat: [...s.chat, { k: 'in' as const, text }, { k: 'ai' as const, text: onboardingAnswer(text, chatCtx) }].slice(-6) });

  const skippable = [3, 4, 5, 6, 7].includes(step) && !(step === 5 && !deliv) && !(step === 7 && waPhone);
  const cur = STEPS[step - 1];

  return (
    <>
      <header className="ob-top">
        <span className="wordmark" style={{ fontSize: 20 }}>
          <Logo size={24} />
          هُدهُد
        </span>
        <span className="grow" />
        {mode === 'wizard' && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={saveLater} disabled={saving}>
            <Icon name="save" size="sm" />
            احفظ وأكمل لاحقاً
          </button>
        )}
      </header>

      {mode === 'resume' && (
        <main className="ob-center" id="main">
          <div className="card empty" style={{ maxWidth: 560, margin: '0 auto' }}>
            <span className="ic brand" style={{ display: 'grid', placeItems: 'center' }}>
              <Icon name="clock" size="xl" />
            </span>
            <h1 style={{ fontSize: 24 }}>أهلاً بعودتك{firstName ? ` يا ${firstName}` : ''}</h1>
            <p className="muted">أكملت {done} من 8 خطوات. حفظنا كل ما أدخلته، ويمكنك المتابعة من حيث توقفت.</p>
            <div className="bar" style={{ width: '100%', maxWidth: 360 }} role="progressbar" aria-label="نسبة الإكمال" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setMode('wizard')}>
              تابع: {STEPS[step - 1][0]}
            </button>
          </div>
        </main>
      )}

      {mode === 'live' && (
        <main className="ob-center" id="main">
          <div className="card empty" style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
            <span className="ic brand" style={{ display: 'grid', placeItems: 'center', width: 80, height: 80, borderRadius: 24 }}>
              <Icon name="check" size="xl" />
            </span>
            <h1 style={{ fontSize: 26 }}>هُدهُد يعمل الآن!</h1>
            <p className="muted">
              سيرد على رسائل عملائك على الرقم <span className="ltr num">{livePhone}</span>، وستجد الطلبات والحجوزات وما يحتاج تدخلك في لوحة التحكم.
            </p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link className="btn btn-primary" href="/dashboard">
                اذهب إلى لوحة التحكم
              </Link>
              <Link className="btn btn-secondary" href="/dashboard/ai">
                عدّل إعدادات هُدهُد
              </Link>
            </div>
            <p className="subtle">نصيحة: أرسل رسالة من رقم آخر إلى واتساب نشاطك لترى هُدهُد يعمل.</p>
          </div>
        </main>
      )}

      {mode === 'wizard' && (
        <div className="ob">
          <nav className="ob-steps" aria-label="خطوات الإعداد">
            <p className="subtle" style={{ marginBottom: 4 }}>
              {done} من 8 خطوات مكتملة
            </p>
            <div className="bar" style={{ marginBottom: 14 }} aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </div>
            <ol>
              {STEPS.map(([title], k) => {
                const i = k + 1;
                const na = i === 5 && !deliv && !!s.type;
                const isDone = stepDone(i, ctx);
                const curr = step === i;
                const note = na ? 'لا تنطبق على نشاطك' : skipped.includes(i) ? 'تخطّيتها، يمكنك العودة إليها' : '';
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={`ob-step${curr ? ' cur' : isDone ? ' done' : ''}${na ? ' na' : ''}`}
                      onClick={() => navigate(i)}
                      aria-current={curr ? 'step' : undefined}
                      disabled={(i > maxStep && !curr) || saving}
                    >
                      <span className="ob-n" aria-hidden="true">
                        {isDone && !curr ? '✓' : i}
                      </span>
                      <span className="col" style={{ gap: 0, alignItems: 'flex-start' }}>
                        <span>{title}</span>
                        {note && (
                          <span className="subtle" style={{ fontSize: 12, fontWeight: 500 }}>
                            {note}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <main className="ob-main" id="main" data-clarity-mask="true">
            <div className="ob-prog" aria-hidden="true">
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                <b>الخطوة {step} من 8</b>
                <span className="subtle">{cur[0]}</span>
              </div>
              <div className="bar">
                <span style={{ width: `${Math.round((step / 8) * 100)}%` }} />
              </div>
            </div>

            <div className="ob-head">
              <span className="subtle">الخطوة {step} من 8</span>
              <h1>{cur[1]}</h1>
              <p className="muted">{cur[2]}</p>
            </div>

            {step === 1 && (
              <StepType
                type={s.type}
                offers={s.offers}
                err={typeErr}
                onType={(k) => {
                  set({ type: k, offers: { ...typeOf(k).offers } });
                  setTypeErr(false);
                }}
                onOffers={(o) => set({ offers: o })}
              />
            )}
            {step === 2 && <StepInfo f={s.f} touched={touched} onChange={(k, v) => set({ f: { ...s.f, [k]: v } })} />}
            {step === 3 && <StepHours hours={s.hours} onChange={(h) => set({ hours: h })} />}
            {step === 4 && <StepCatalog rows={s.rows} offers={s.offers} onChange={(r) => set({ rows: r })} onImport={() => toast('رفع الملفات متاح من صفحة المنتجات والخدمات')} />}
            {step === 5 && <StepDelivery applicable={deliv} zones={s.zones} freeOver={s.freeOver} onZones={(z) => set({ zones: z })} onFree={(v) => set({ freeOver: v })} onEnable={() => set({ offers: { ...s.offers, delivery: true } })} />}
            {step === 6 && <StepFaq rows={faqRows} touched={touched} onChange={(r) => set({ faqs: r })} />}
            {step === 7 && <WhatsAppConnect connectedPhone={waPhone} onConnected={(p) => setWaPhone(p)} />}
            {step === 8 && (
              <>
                <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>
                  <section className="card" aria-labelledby="sm-h">
                    <div className="card-head">
                      <h2 id="sm-h">ملخص الإعداد</h2>
                    </div>
                    <ul>
                      {STEPS.slice(0, 7).map(([title], k) => {
                        const i = k + 1;
                        const na = i === 5 && !deliv;
                        const ok = na || stepDone(i, ctx);
                        return (
                          <li key={i} className="row" style={{ gap: 10, padding: '10px 20px', borderTop: '1px solid #E6E9F0' }}>
                            <span className={`count ${ok ? 'brand' : 'warm'}`} aria-hidden="true">
                              {ok ? '✓' : '!'}
                            </span>
                            <span className="grow">
                              {title}
                              {na ? ' (لا تنطبق)' : ''}
                            </span>
                            {!ok && (
                              <button type="button" className="btn-link" onClick={() => navigate(i)}>
                                {i === 7 ? 'اربط الآن' : 'أكملها'}
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                  <section className="card" aria-labelledby="tt-h">
                    <div className="card-head">
                      <div>
                        <h2 id="tt-h">جرّب هُدهُد</h2>
                        <span className="subtle">تجربة فقط، لا تُحفظ</span>
                      </div>
                    </div>
                    <div className="chat" style={{ background: '#EFEAE2', padding: 14, minHeight: 200 }}>
                      {s.chat.map((m, i) => (
                        <div key={i} className={m.k === 'in' ? 'msg in' : 'msg ai'}>
                          {m.k === 'ai' && <div className="who">هُدهُد</div>}
                          {m.text}
                        </div>
                      ))}
                    </div>
                    <div className="card-body row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      {tests.map((t) => (
                        <button key={t} type="button" className="chip sm" onClick={() => ask(t)}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                {!waPhone && touched && (
                  <div className="alert warning" role="alert" style={{ marginTop: 16 }}>
                    <span>
                      يجب ربط واتساب قبل التفعيل.{' '}
                      <button type="button" className="btn-link" onClick={() => navigate(7)}>
                        اربط واتساب الآن
                      </button>
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="ob-foot">
              {step > 1 && (
                <button type="button" className="btn btn-secondary" onClick={() => navigate(step - 1)} disabled={saving}>
                  السابق
                </button>
              )}
              <span className="grow" />
              {skippable && (
                <button type="button" className="btn btn-ghost" onClick={skip} disabled={saving}>
                  {step === 7 ? 'سأربطه لاحقاً' : 'تخطَّ الآن'}
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={next} disabled={saving} style={{ minWidth: 140 }}>
                {saving && <span className="spin" />}
                {step === 8 ? 'فعّل هُدهُد' : 'التالي'}
              </button>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
