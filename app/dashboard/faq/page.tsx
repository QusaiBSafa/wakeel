'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/components/app/Store';
import { Icon } from '@/components/ui/icons';
import { CATEGORIES, DAYS } from '@/lib/constants';
import { dayHours } from '@/lib/slots';
import { isAutoFaq, readiness } from '@/lib/readiness';
import { api, ApiError } from '@/lib/client/api';
import type { AppState, FaqDTO } from '@/lib/types';

type Filter = 'all' | 'open' | 'answered' | 'skipped';
const FILTERS: [Filter, string][] = [
  ['all', 'الكل'],
  ['open', 'بانتظار جوابك'],
  ['answered', 'مجاوبة'],
  ['skipped', 'متخطّاة'],
];

const inFilter = (f: FaqDTO, k: Filter) => k === 'all' || (k === 'answered' ? f.status === 'answered' || isAutoFaq(f) : f.status === k && !isAutoFaq(f));

function hoursAnswer(s: AppState) {
  if (s.business.hoursMode === 'custom') return s.business.hoursText || 'لسّا ما كتبت ساعات العمل.';
  return s.booking.days.map((d, i) => `${DAYS[i]}: ${dayHours(d)}`).join(' · ');
}

export default function FaqPage() {
  const { state, setState, track, showToast } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [newQErr, setNewQErr] = useState('');

  const r = readiness(state);
  const cat = CATEGORIES.find((c) => c.k === state.business.category) ?? CATEGORIES[4];
  const list = state.faqs.filter((f) => inFilter(f, filter));

  const setFaq = (id: string, patch: Partial<FaqDTO>) => setState((s) => ({ ...s, faqs: s.faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));

  const patch = async (f: FaqDTO, body: Partial<Pick<FaqDTO, 'answer' | 'status'>>) => {
    const before = f;
    setFaq(f.id, body);
    try {
      const saved = await track(api<FaqDTO>('PATCH', `/api/app/faqs/${f.id}`, body));
      setFaq(f.id, saved);
    } catch {
      setFaq(f.id, before);
      showToast('ما قدرنا نحفظ التغيير. رجّعناه.');
    }
  };

  const remove = async (f: FaqDTO) => {
    const prev = state.faqs;
    setState((s) => ({ ...s, faqs: s.faqs.filter((x) => x.id !== f.id) }));
    setConfirmId(null);
    setOpenId(null);
    try {
      await track(api('DELETE', `/api/app/faqs/${f.id}`));
      showToast('انحذف السؤال', 'تراجع', async () => {
        setState((s) => ({ ...s, faqs: [...s.faqs, f].sort((a, b) => a.position - b.position) }));
        try {
          const back = await track(
            api<FaqDTO>('POST', '/api/app/faqs', { question: f.question, answer: f.answer, templateKey: f.templateKey, position: f.position, status: f.status }),
          );
          setState((s) => ({ ...s, faqs: s.faqs.map((x) => (x.id === f.id ? back : x)) }));
        } catch {
          setState((s) => ({ ...s, faqs: s.faqs.filter((x) => x.id !== f.id) }));
          showToast('ما قدرنا نرجّع السؤال');
        }
      });
    } catch {
      setState((s) => ({ ...s, faqs: prev }));
      showToast('ما قدرنا نحذف السؤال. رجّعناه.');
    }
  };

  const addQ = async () => {
    const q = newQ.trim();
    if (!q) return setNewQErr('اكتب السؤال');
    if (state.faqs.some((f) => f.question === q)) return setNewQErr('هالسؤال موجود بالقائمة');
    const a = newA.trim();
    const top = state.faqs.reduce((m, f) => Math.max(m, f.position), 0);
    const tmp: FaqDTO = { id: `tmp-${Date.now()}`, templateKey: null, question: q, answer: a, status: a ? 'answered' : 'open', position: top + 10 };
    setState((s) => ({ ...s, faqs: [...s.faqs, tmp] }));
    setNewQ('');
    setNewA('');
    setFilter('all');
    try {
      const saved = await track(api<FaqDTO>('POST', '/api/app/faqs', { question: q, answer: a }));
      setState((s) => ({ ...s, faqs: s.faqs.map((f) => (f.id === tmp.id ? saved : f)) }));
      showToast('انضاف السؤال');
    } catch (e) {
      setState((s) => ({ ...s, faqs: s.faqs.filter((f) => f.id !== tmp.id) }));
      setNewQ(q);
      setNewA(a);
      if (e instanceof ApiError && e.status === 409) setNewQErr(e.message);
      else showToast('ما قدرنا نضيف السؤال، جرّب كمان مرة');
    }
  };

  const tagFor = (f: FaqDTO): [string, string] =>
    isAutoFaq(f)
      ? ['tag indigo', 'تلقائي']
      : f.status === 'answered'
        ? ['tag', 'مجاوب']
        : f.status === 'skipped'
          ? ['tag gray', 'متخطّى']
          : ['tag amber', 'بانتظار جوابك'];

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>الأسئلة الشائعة</h1>
          <p className="muted">أكثر أسئلة بيسألها زباين {cat.plural}. جاوب على اللي بخصّك وتخطّى الباقي.</p>
        </div>
        <div style={{ flex: '0 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
            <span>جاوبت</span>
            <span>
              {r.faqAnswered} من {r.faqTotal}
            </span>
          </div>
          <div className="bar">
            <span style={{ width: `${r.faqTotal ? Math.round((r.faqAnswered / r.faqTotal) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="فلترة الأسئلة" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            className={filter === k ? 'chip on' : 'chip'}
            aria-selected={filter === k}
            onClick={() => {
              setFilter(k);
              setOpenId(null);
            }}
          >
            {label} <span style={{ opacity: 0.7 }}>{state.faqs.filter((x) => inFilter(x, k)).length}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-clarity-mask="true">
        {list.map((f) => {
          const auto = isAutoFaq(f);
          const isOpen = openId === f.id;
          const [tagCls, tag] = tagFor(f);
          const preview = auto ? hoursAnswer(state) : f.status === 'skipped' ? 'هُدهُد رح يحوّل هالسؤال إلك.' : f.answer;
          const inputId = `faq-${f.id}`;
          return (
            <article key={f.id} className="card card-tight" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>{f.question}</h3>
                  {preview.trim() && !isOpen && (
                    <p className="muted" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
                      {preview}
                    </p>
                  )}
                </div>
                <span className={tagCls}>{tag}</span>
              </div>
              {isOpen ? (
                <>
                  <div className="field">
                    <label htmlFor={inputId}>جوابك</label>
                    <textarea id={inputId} className="input" value={draft} maxLength={1000} autoFocus onChange={(e) => setDraft(e.target.value)} placeholder="اكتب الجواب زي ما بتحكيه للزبون" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const a = draft.trim();
                        setOpenId(null);
                        patch(f, { answer: a, status: a ? 'answered' : 'open' });
                      }}
                    >
                      احفظ الجواب
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}>
                      إلغاء
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {!auto && (
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={() => {
                        setOpenId(f.id);
                        setDraft(f.answer);
                        setConfirmId(null);
                      }}
                    >
                      {f.status === 'answered' ? 'عدّل الجواب' : 'جاوب'}
                    </button>
                  )}
                  {!auto && f.status === 'open' && (
                    <button type="button" className="btn btn-text btn-sm" onClick={() => patch(f, { status: 'skipped' })}>
                      ما بنطبق عليّ
                    </button>
                  )}
                  {auto && (
                    <Link href="/dashboard/booking" className="tap" style={{ fontSize: 14 }}>
                      بتتعدّل من صفحة المواعيد
                    </Link>
                  )}
                  <span style={{ flex: 1 }} />
                  {confirmId === f.id ? (
                    <div role="alert" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, background: '#FEF3F2', borderRadius: 10, padding: '4px 4px 4px 10px' }}>
                      <span style={{ fontWeight: 700, color: '#7A271A', paddingInlineStart: 6 }}>تحذف هالسؤال؟</span>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(f)}>
                        احذف
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)} autoFocus>
                        لا
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="icon-btn sm danger" onClick={() => setConfirmId(f.id)} aria-label={`احذف السؤال: ${f.question}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {list.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', padding: 24 }}>
            ما في أسئلة بهالقائمة.
          </p>
        )}
      </div>

      <section className="card" aria-labelledby="nq-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-clarity-mask="true">
        <h2 id="nq-h" style={{ fontSize: 18, fontWeight: 800 }}>
          أضف سؤال من عندك
        </h2>
        <div className="field">
          <label htmlFor="nq-q">السؤال</label>
          <input
            id="nq-q"
            className={newQErr ? 'input bad' : 'input'}
            value={newQ}
            maxLength={200}
            aria-invalid={!!newQErr}
            onChange={(e) => {
              setNewQ(e.target.value);
              setNewQErr('');
            }}
            placeholder="مثلاً: بتعملوا خصم للطلاب؟"
          />
          {newQErr && <div className="err">{newQErr}</div>}
        </div>
        <div className="field">
          <label htmlFor="nq-a">
            الجواب <span className="opt">(بتقدر تكتبه بعدين)</span>
          </label>
          <textarea id="nq-a" className="input" value={newA} maxLength={1000} onChange={(e) => setNewA(e.target.value)} />
        </div>
        <button type="button" className="btn btn-soft" style={{ alignSelf: 'flex-start' }} onClick={addQ}>
          <Icon name="plus" />
          أضف السؤال
        </button>
      </section>
    </>
  );
}
