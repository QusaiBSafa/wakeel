'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PauseDialog, { type PauseChoice } from '@/components/ai/PauseDialog';
import TestChat from '@/components/ai/TestChat';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { aiConfigSchema } from '@/lib/validation/ai';
import { clock } from '@/lib/format';
import { minorToInput, parsePriceToMinor } from '@/lib/money';
import { hhmm, minutesOf, ymd } from '@/lib/time';
import type { AiData } from '@/lib/server/loaders/ai';
import type { AiConfig } from '@/lib/types';

const PERMS: [keyof AiConfig['perms'], string, string, string][] = [
  ['orders', 'تسجيل الطلبات', 'يجمع المنتجات والكميات والعنوان، ويحفظ الطلب في صفحة الطلبات', 'عند إيقافه، يحوّل هُدهُد كل طلب شراء إليك في «تحتاج تدخلك».'],
  ['bookings', 'حجز المواعيد', 'يقترح الأوقات المتاحة فقط، حسب أوقات العمل وقواعد التأكيد في صفحة الحجوزات', 'عند إيقافه، يحوّل هُدهُد كل طلب حجز إليك.'],
  ['resched', 'تغيير الموعد أو إلغاؤه بطلب العميل', 'ضمن سياسة الإلغاء المكتوبة في معلومات نشاطك', ''],
  ['prices', 'ذكر الأسعار', 'من صفحة المنتجات والخدمات فقط', 'عند إيقافه، يخبر هُدهُد العميل بأن الفريق سيرسل له الأسعار.'],
  ['alt', 'اقتراح بديل عند نفاد منتج', 'يقترح منتجاً مشابهاً متوفراً', ''],
  ['discount', 'تقديم خصومات', 'عند إيقافه، لا يعرض هُدهُد أي خصم غير مذكور في منتجاتك أو أسئلتك الشائعة', ''],
];
const MODES: [AiConfig['mode'], string, string][] = [
  ['auto', 'يرد ويسجّل تلقائياً', 'يرد على العملاء، ويسجّل الطلبات والحجوزات حسب الصلاحيات أدناه.'],
  ['approve', 'يرد تلقائياً، وأوافق أنا على الطلبات والحجوزات', 'يبقى كل طلب أو حجز بانتظار موافقتك في لوحة التحكم قبل تأكيده للعميل.'],
];
const LANGS: [AiConfig['lang'], string, string][] = [
  ['match', 'حسب لغة العميل', 'يرد بالعربية الفصحى، أو بالإنجليزية إذا كتب العميل بها.'],
  ['fusha', 'العربية الفصحى دائماً', 'لغة واضحة ومهذبة لجميع العملاء.'],
  ['dialect', 'اللهجة الفلسطينية', 'أقرب إلى أسلوب الحديث اليومي مع العملاء.'],
];
const TONES: [AiConfig['tone'], string, string][] = [
  ['friendly', 'ودود', 'يرحّب بالعميل بحرارة ويختم بعرض المساعدة.'],
  ['formal', 'رسمي', 'عبارات مهذبة ورسمية، دون مزاح.'],
  ['short', 'مختصر', 'يدخل في الجواب مباشرة بأقل عدد من الكلمات.'],
];
const UNK: [AiConfig['unk'], string, string][] = [
  ['handoff', 'يعتذر ويحوّل المحادثة إليك', 'يخبر العميل أن الفريق سيرد قريباً، وتظهر المحادثة في «تحتاج تدخلك».'],
  ['call', 'يطلب من العميل الاتصال بالمركز', 'يرسل رقم الهاتف المكتوب في معلومات نشاطك.'],
  ['custom', 'يرسل رسالة أكتبها أنا', 'وتظهر المحادثة أيضاً في «تحتاج تدخلك».'],
];

type Form = Omit<AiConfig, 'bigMinor' | 'groupNum'> & { bigNum: string; groupNum: string };
const toForm = (c: AiConfig): Form => ({ ...c, bigNum: minorToInput(c.bigMinor), groupNum: String(c.groupNum) });
function fromForm(f: Form): AiConfig {
  const { bigNum, groupNum, ...rest } = f;
  return { ...rest, bigMinor: parsePriceToMinor(bigNum) ?? 50000, groupNum: Math.max(2, parseInt(groupNum, 10) || 3) };
}

function pausedText(until: string | null, now: number): string {
  if (!until) return 'حتى تعيد تشغيلها';
  const t = new Date(until);
  if (minutesOf(t) === 9 * 60 && ymd(t) !== ymd(now)) return 'حتى صباح الغد (9:00 ص)';
  return `لمدة ساعة (حتى ${clock(minutesOf(t))})`;
}

export default function AiClient({ data }: { data: AiData }) {
  const router = useRouter();
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [saved, setSaved] = useState<Form>(toForm(data.config));
  const [f, setF] = useState<Form>(toForm(data.config));
  const [on, setOn] = useState(data.enabled);
  const [pausedUntil, setPausedUntil] = useState(data.pausedUntil);
  if (src !== data) {
    setSrc(data);
    setSaved(toForm(data.config));
    setF(toForm(data.config));
    setOn(data.enabled);
    setPausedUntil(data.pausedUntil);
  }
  const [pauseOpen, setPauseOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unkErr, setUnkErr] = useState(false);
  const now = new Date(data.now).getTime();
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });

  async function pause(c: PauseChoice) {
    setBusy(true);
    try {
      const r = await api<{ pausedUntil: string | null }>('POST', '/api/app/ai/pause', { duration: c });
      setOn(false);
      setPausedUntil(r.pausedUntil);
      setPauseOpen(false);
      toast('أُوقفت الردود التلقائية');
      router.refresh();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function resume() {
    try {
      await api('POST', '/api/app/ai/resume');
      setOn(true);
      setPausedUntil(null);
      toast('عاد هُدهُد للرد على العملاء');
      router.refresh();
    } catch (e) {
      fail(e);
    }
  }

  async function save() {
    if (f.unk === 'custom' && !f.unkMsg.trim()) {
      setUnkErr(true);
      return;
    }
    const config = fromForm(f);
    const parsed = aiConfigSchema.safeParse(config);
    if (!parsed.success) {
      toast(parsed.error.issues[0]?.message || 'البيانات غير صحيحة', { kind: 'bad' });
      return;
    }
    setBusy(true);
    try {
      await api('PUT', '/api/app/ai', { config });
      setSaved(f);
      setUnkErr(false);
      toast('حُفظت الإعدادات، ويعمل بها هُدهُد الآن');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  const tone = TONES.find((t) => t[0] === f.tone);
  const dayRows = Array.from({ length: 7 }, (_, wd) => {
    const h = data.hours.find((x) => x.weekday === wd);
    return { on: h?.open ?? wd !== 6, from: h ? hhmm(h.openMin) : '09:00', to: h ? hhmm(h.closeMin) : '19:00' };
  });
  const cfg = fromForm(f);

  const radios = <K extends string>(defs: [K, string, string][], value: K, onPick: (k: K) => void, name: string) =>
    defs.map(([k, title, desc]) => (
      <label key={k} className={value === k ? 'radio-card on' : 'radio-card'}>
        <input type="radio" name={name} checked={value === k} onChange={() => onPick(k)} />
        <span>
          <b>{title}</b>
          <span className="subtle">{desc}</span>
        </span>
      </label>
    ));

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>إعدادات هُدهُد</h1>
          <p>حدّد كيف يرد هُدهُد على عملائك، وما الذي يُسمح له بفعله، ومتى يحوّل الأمر إليك.</p>
        </div>
      </div>

      <div className="col" style={{ gap: 20 }}>
        <section className={on ? 'card row' : 'card row paused'} aria-labelledby="ms-h">
          <span className={on ? 'ic brand' : 'ic warn'} style={{ display: 'grid', placeItems: 'center', flex: 'none' }}>
            <Icon name={on ? 'check' : 'pause'} size="lg" />
          </span>
          <div className="grow" style={{ minWidth: 0 }}>
            <h2 id="ms-h" style={{ fontSize: 17 }}>
              {on ? 'هُدهُد يرد على عملائك الآن' : 'الردود التلقائية متوقفة'}
            </h2>
            <p className="muted" style={{ fontSize: 14 }}>
              {on ? 'يرد على رسائل واتساب على مدار الساعة، ويحوّل إليك ما يحتاج تدخلك.' : `متوقفة ${pausedText(pausedUntil, now)}. ردّ على العملاء من تطبيق واتساب مباشرة.`}
            </p>
          </div>
          <label className="row" style={{ gap: 10, fontWeight: 600, minHeight: 44 }}>
            <span className="hide-m">الردود التلقائية</span>
            <button type="button" className={on ? 'sw on' : 'sw'} role="switch" aria-checked={on} aria-label="الردود التلقائية" onClick={() => (on ? setPauseOpen(true) : resume())} />
          </label>
        </section>

        {dirty && (
          <div className="alert warning" role="status" style={{ alignItems: 'center', flexWrap: 'wrap', position: 'sticky', top: 8, zIndex: 5 }}>
            <span className="grow" style={{ flex: '1 1 200px' }}>
              <b>لديك تغييرات غير محفوظة.</b> يستمر هُدهُد بالإعدادات السابقة حتى تحفظ.
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setF(saved);
                setUnkErr(false);
                toast('أُعيدت الإعدادات المحفوظة');
              }}
            >
              تجاهل
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              احفظ التغييرات
            </button>
          </div>
        )}

        <div className="split">
          <div className="col" style={{ gap: 20, minWidth: 0 }}>
            <section className="card" aria-labelledby="md-h">
              <div className="card-head">
                <div>
                  <h2 id="md-h">طريقة العمل</h2>
                  <span className="subtle">يمكنك تغييرها في أي وقت</span>
                </div>
              </div>
              <div className="card-body col" style={{ gap: 8 }} role="radiogroup" aria-labelledby="md-h">
                {radios(MODES, f.mode, (k) => set({ mode: k }), 'mode')}
              </div>
            </section>

            <section className="card" aria-labelledby="lg-h">
              <div className="card-head">
                <div>
                  <h2 id="lg-h">اللغة والأسلوب</h2>
                  <span className="subtle">جرّب أثر كل خيار في نافذة التجربة</span>
                </div>
              </div>
              <div className="card-body col" style={{ gap: 18 }}>
                <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="lbl" style={{ marginBottom: 8 }}>
                    لغة الرد
                  </legend>
                  <div className="col" style={{ gap: 8 }}>
                    {radios(LANGS, f.lang, (k) => set({ lang: k }), 'lang')}
                  </div>
                </fieldset>
                <div className="field">
                  <span className="lbl" id="tn-l">
                    الأسلوب
                  </span>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-labelledby="tn-l">
                    {TONES.map(([k, label]) => (
                      <button key={k} type="button" className={f.tone === k ? 'chip on' : 'chip'} aria-pressed={f.tone === k} onClick={() => set({ tone: k })}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="hint">{tone?.[2]}</span>
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label htmlFor="ai-name">الاسم الذي يعرّف به نفسه</label>
                    <input id="ai-name" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="هُدهُد" maxLength={30} />
                    <span className="hint">مثلاً: «معك {f.name.trim() || 'هُدهُد'} من {data.business.name}»</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid #E6E9F0', borderRadius: 12, alignSelf: 'start' }}>
                    <span>
                      <b style={{ display: 'block' }}>استخدام الرموز التعبيرية</b>
                      <span className="subtle">باعتدال، مثل 🌸 أو 👍</span>
                    </span>
                    <button type="button" className={f.emoji ? 'sw on' : 'sw'} role="switch" aria-checked={f.emoji} aria-label="استخدام الرموز التعبيرية" onClick={() => set({ emoji: !f.emoji })} />
                  </div>
                </div>
              </div>
            </section>

            <section className="card" aria-labelledby="pm-h">
              <div className="card-head">
                <div>
                  <h2 id="pm-h">ما يُسمح لهُدهُد بفعله</h2>
                  <span className="subtle">ما لا تسمح به يُحوَّل إليك في «تحتاج تدخلك»</span>
                </div>
              </div>
              <ul>
                {PERMS.map(([k, title, desc, warn]) => (
                  <li key={k} style={{ padding: '14px 20px', borderTop: '1px solid #E6E9F0' }}>
                    <div className="row" style={{ justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                      <span className="col" style={{ gap: 2, minWidth: 0 }}>
                        <b>{title}</b>
                        <span className="subtle">{desc}</span>
                      </span>
                      <button type="button" className={f.perms[k] ? 'sw on' : 'sw'} role="switch" aria-checked={f.perms[k]} aria-label={title} onClick={() => set({ perms: { ...f.perms, [k]: !f.perms[k] } })} style={{ marginTop: 2 }} />
                    </div>
                    {!f.perms[k] && warn && (
                      <div className="alert info" style={{ marginTop: 10, fontSize: 13, padding: '8px 12px' }}>
                        {warn}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card" aria-labelledby="ho-h">
              <div className="card-head">
                <div>
                  <h2 id="ho-h">متى يحوّل هُدهُد المحادثة إليك؟</h2>
                  <span className="subtle">يتوقف هُدهُد عن الرد في هذه المحادثة حتى تردّ أو تعيدها إليه</span>
                </div>
              </div>
              <div className="card-body col" style={{ gap: 8 }}>
                {(
                  [
                    ['human', 'يطلب العميل التحدث مع شخص من الفريق', 'دائماً مفعّل، لا يمكن إيقافه', true],
                    ['complaint', 'شكوى أو عميل غير راضٍ', 'يعتذر هُدهُد بلطف ويخبر العميل أن الفريق سيتواصل معه'],
                    ['unknown', 'سؤال لا يعرف هُدهُد جوابه', 'حسب ما تختاره في «إذا لم يعرف هُدهُد الجواب»'],
                    ['discount', 'طلب خصم أو تفاوض على السعر', ''],
                    ['big', 'طلب تزيد قيمته على', 'لتتأكد بنفسك من الطلبات الكبيرة', false, 'bigNum', '₪'],
                    ['group', 'حجز لعدد أشخاص أكبر من', 'مثل حجوزات العرائس والمجموعات', false, 'groupNum', 'أشخاص'],
                  ] as [keyof AiConfig['rules'], string, string, boolean?, ('bigNum' | 'groupNum')?, string?][]
                ).map(([k, label, hint, locked, numKey, unit]) => (
                  <div key={k} className={f.rules[k] ? 'check on' : 'check'} style={{ flexWrap: 'wrap', height: 'auto', minHeight: 44, padding: '6px 12px' }}>
                    <label className="row grow" style={{ gap: 10, minHeight: 32, cursor: 'pointer' }}>
                      <input type="checkbox" checked={f.rules[k]} disabled={!!locked} onChange={() => !locked && set({ rules: { ...f.rules, [k]: !f.rules[k] } })} />
                      <span>{label}</span>
                    </label>
                    {numKey && (
                      <span className="row" style={{ gap: 6 }}>
                        <label className="sr-only" htmlFor={`rn-${k}`}>
                          {label} ({unit})
                        </label>
                        <input id={`rn-${k}`} className="input ltr" inputMode="numeric" value={f[numKey]} onChange={(e) => set({ [numKey]: e.target.value.replace(/[^\d.]/g, '') } as Partial<Form>)} style={{ width: 76, minHeight: 40 }} />
                        <span className="muted" style={{ fontSize: 14 }}>
                          {unit}
                        </span>
                      </span>
                    )}
                    {hint && (
                      <span className="subtle" style={{ flexBasis: '100%', paddingInlineStart: 28, fontSize: 12.5 }}>
                        {hint}
                      </span>
                    )}
                  </div>
                ))}
                <div className="field" style={{ marginTop: 10 }}>
                  <span className="lbl">كيف نبلغك؟</span>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {(
                      [
                        ['dash', 'إشعار في لوحة التحكم', true],
                        ['wa', `رسالة واتساب إلى ${data.business.phone || 'رقم نشاطك'}`],
                        ['email', `بريد إلكتروني إلى ${data.ownerEmail || 'بريدك'}`],
                      ] as [keyof AiConfig['notify'], string, boolean?][]
                    ).map(([k, label, locked]) => (
                      <label key={k} className={f.notify[k] ? 'check on' : 'check'}>
                        <input type="checkbox" checked={f.notify[k]} disabled={!!locked} onChange={() => !locked && set({ notify: { ...f.notify, [k]: !f.notify[k] } })} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="card" aria-labelledby="uk-h">
              <div className="card-head">
                <div>
                  <h2 id="uk-h">إذا لم يعرف هُدهُد الجواب</h2>
                  <span className="subtle">لن يخترع هُدهُد معلومات غير موجودة في صفحاتك</span>
                </div>
              </div>
              <div className="card-body col" style={{ gap: 8 }} role="radiogroup" aria-labelledby="uk-h">
                {radios(UNK, f.unk, (k) => set({ unk: k }), 'unk')}
                {f.unk === 'custom' && (
                  <div className="field">
                    <label htmlFor="unk-msg">نص الرسالة</label>
                    <textarea
                      id="unk-msg"
                      className={unkErr && !f.unkMsg.trim() ? 'input bad' : 'input'}
                      value={f.unkMsg}
                      onChange={(e) => {
                        set({ unkMsg: e.target.value });
                        setUnkErr(false);
                      }}
                    />
                    {unkErr && !f.unkMsg.trim() && <span className="err">اكتب نص الرسالة</span>}
                  </div>
                )}
              </div>
            </section>
          </div>

          <TestChat ctx={{ cfg, on, business: data.business, hours: dayRows, item: data.item }} />
        </div>
      </div>

      {pauseOpen && <PauseDialog busy={busy} onClose={() => setPauseOpen(false)} onConfirm={pause} />}
    </main>
  );
}
