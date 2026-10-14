'use client';

import { useState } from 'react';
import FaqDrawer from '@/components/faq/FaqDrawer';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { FAQ_CATEGORIES, faqSuggestionsFor, typeOf } from '@/lib/constants';
import { agoText } from '@/lib/format';
import type { FaqData } from '@/lib/server/loaders/faq';
import type { FaqDTO } from '@/lib/types';

type Edit = { faq: FaqDTO | null; prefill?: { question: string; key: string } | null };

export default function FaqClient({ data }: { data: FaqData }) {
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [faqs, setFaqs] = useState<FaqDTO[]>(data.faqs);
  const [dismissed, setDismissed] = useState<string[]>(data.dismissed);
  if (src !== data) {
    setSrc(data);
    setFaqs(data.faqs);
    setDismissed(data.dismissed);
  }
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [edit, setEdit] = useState<Edit | null>(null);
  const [del, setDel] = useState<FaqDTO | null>(null);
  const now = new Date(data.now).getTime();

  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
  const term = q.trim();
  const list = faqs.filter((x) => (cat === 'all' || x.category === cat) && (!term || x.question.includes(term) || x.answer.includes(term)));
  const existing = new Set(faqs.map((x) => x.question.trim()));
  const sugg = faqSuggestionsFor(data.type).filter((g) => !dismissed.includes(g.key) && !existing.has(g.q));
  const active = faqs.filter((x) => x.enabled).length;
  const used = faqs.reduce((n, x) => n + x.usageCount, 0);

  async function toggle(x: FaqDTO) {
    try {
      const saved = await api<FaqDTO>('PATCH', `/api/app/faqs/${x.id}`, { enabled: !x.enabled });
      setFaqs((all) => all.map((y) => (y.id === x.id ? saved : y)));
      toast(x.enabled ? 'أُوقف السؤال، ولن يستخدمه هُدهُد' : 'فُعّل السؤال');
    } catch (e) {
      fail(e);
    }
  }

  async function dismiss(key: string) {
    try {
      const r = await api<{ dismissed: string[] }>('POST', '/api/app/faqs/suggestions/dismiss', { key });
      setDismissed(r.dismissed);
    } catch (e) {
      fail(e);
    }
  }

  async function remove() {
    const x = del;
    if (!x) return;
    const index = faqs.findIndex((y) => y.id === x.id);
    try {
      await api('DELETE', `/api/app/faqs/${x.id}`);
      setFaqs((all) => all.filter((y) => y.id !== x.id));
      setDel(null);
      toast('تم حذف السؤال', {
        undo: async () => {
          try {
            const back = await api<FaqDTO>('POST', `/api/app/faqs/${x.id}/restore`);
            setFaqs((all) => {
              const arr = all.slice();
              arr.splice(Math.min(index, arr.length), 0, back);
              return arr;
            });
          } catch (e) {
            fail(e);
          }
        },
      });
    } catch (e) {
      fail(e);
    }
  }

  const catLabel = (k: string) => FAQ_CATEGORIES.find((c) => c.k === k)?.label ?? '';

  return (
    <main className="page" id="main" style={{ maxWidth: 1100 }}>
      <div className="page-head">
        <div className="t">
          <h1>الأسئلة الشائعة</h1>
          <p>أجوبة جاهزة يستخدمها هُدهُد كما كتبتها. أضف الأسئلة التي يكرّرها عملاؤك.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ faq: null })}>
          <Icon name="plus" />
          إضافة سؤال
        </button>
      </div>

      <div className="col" style={{ gap: 20 }}>
        {sugg.length > 0 && (
          <section className="card" aria-labelledby="sg-h">
            <div className="card-head">
              <div className="row grow" style={{ gap: 12 }}>
                <span className="ic indigo" style={{ display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <Icon name="sparkle" />
                </span>
                <div>
                  <h2 id="sg-h">أسئلة يطرحها عادةً عملاء {typeOf(data.type).plural}</h2>
                  <span className="subtle">اقتراحات حسب نوع نشاطك، لم تُضف بعد</span>
                </div>
              </div>
            </div>
            <ul style={{ padding: '4px 0' }}>
              {sugg.map((g) => (
                <li key={g.key} className="sugg">
                  <span className="grow" style={{ fontWeight: 600, fontSize: 14.5 }}>
                    {g.q}
                  </span>
                  <div className="row" style={{ gap: 4 }}>
                    <button type="button" className="btn btn-soft btn-sm" onClick={() => setEdit({ faq: null, prefill: { question: g.q, key: g.key } })} aria-label={`أضف جواباً لسؤال: ${g.q}`}>
                      أضف جواباً
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(g.key)} aria-label={`تجاهل سؤال: ${g.q}`}>
                      تجاهل
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {faqs.length === 0 ? (
          <EmptyState icon="help" title="لا توجد أسئلة بعد" text="ابدأ بالأسئلة المقترحة أعلاه أو أضف سؤالاً يتكرّر كثيراً. يجيب هُدهُد من معلومات نشاطك حتى تضيف أجوبتك.">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit({ faq: null })}>
              أضف أول سؤال
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="toolbar">
              <div className="search" style={{ flex: '1 1 240px' }}>
                <Icon name="search" />
                <label htmlFor="f-q" className="sr-only">
                  ابحث في الأسئلة
                </label>
                <input id="f-q" className="input" type="search" placeholder="ابحث في الأسئلة والأجوبة" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label="التصنيف">
                {[{ k: 'all', label: 'الكل' }, ...FAQ_CATEGORIES].map((c) => (
                  <button key={c.k} type="button" className={cat === c.k ? 'chip on' : 'chip'} aria-pressed={cat === c.k} onClick={() => setCat(c.k)}>
                    {c.label}
                    <span className="ct num">{c.k === 'all' ? faqs.length : faqs.filter((x) => x.category === c.k).length}</span>
                  </button>
                ))}
              </div>
            </div>

            <section className="card" aria-label="قائمة الأسئلة">
              <div className="card-head">
                <span className="subtle">
                  {faqs.length} أسئلة · {active} مفعّلة · استخدمها هُدهُد {used} مرة هذا الشهر
                </span>
              </div>
              {list.length === 0 && (
                <div className="empty" style={{ padding: '32px 20px' }}>
                  <b>لا توجد نتائج</b>
                  <p className="muted" style={{ fontSize: 14 }}>
                    جرّب كلمة أخرى أو اختر «الكل».
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setQ('');
                      setCat('all');
                    }}
                  >
                    مسح البحث
                  </button>
                </div>
              )}
              <ul>
                {list.map((f) => (
                  <li key={f.id} className={f.enabled ? 'faq' : 'faq off'}>
                    <div className="col grow" style={{ gap: 6, minWidth: 0 }}>
                      <h3 style={{ fontSize: 15.5, lineHeight: 1.5 }}>{f.question}</h3>
                      <p className="ans">{f.answer}</p>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap', fontSize: 12.5 }}>
                        <span className="bdg outline">{catLabel(f.category)}</span>
                        <span className="subtle" style={{ fontSize: 12.5 }}>
                          {f.usageCount ? `استُخدم ${f.usageCount} مرة هذا الشهر · ` : 'لم يُستخدم هذا الشهر · '}آخر تحديث: {agoText(f.updatedAt, now)}
                        </span>
                        {!f.enabled && <span className="bdg neutral">متوقف: لا يستخدمه هُدهُد</span>}
                      </div>
                    </div>
                    <div className="faq-acts">
                      <label className="row" style={{ gap: 8, fontSize: 13, color: '#4A5468', minHeight: 40, paddingInlineEnd: 8 }}>
                        <button type="button" className={f.enabled ? 'sw on' : 'sw'} role="switch" aria-checked={f.enabled} aria-label={`تفعيل سؤال: ${f.question}`} onClick={() => toggle(f)} />
                        <span>{f.enabled ? 'مفعّل' : 'متوقف'}</span>
                      </label>
                      <div className="row" style={{ gap: 2 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit({ faq: f })} aria-label={`تعديل سؤال: ${f.question}`}>
                          <Icon name="edit" size="sm" />
                          تعديل
                        </button>
                        <button type="button" className="ib sm danger" onClick={() => setDel(f)} aria-label={`حذف سؤال: ${f.question}`}>
                          <Icon name="trash" size="sm" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <p className="subtle row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <Icon name="shield" size="sm" style={{ flex: 'none', marginTop: 3 }} />
          <span>لا يحفظ هُدهُد نصوص المحادثات. تظهر هنا أعداد الاستخدام فقط، دون أي معلومة عن العملاء أو رسائلهم.</span>
        </p>
      </div>

      {edit && (
        <FaqDrawer
          key={edit.faq?.id ?? edit.prefill?.key ?? 'new'}
          faq={edit.faq}
          prefill={edit.prefill}
          onClose={() => setEdit(null)}
          onSaved={(saved, isNew) => {
            setFaqs((all) => (isNew ? [saved, ...all] : all.map((y) => (y.id === saved.id ? saved : y))));
            setEdit(null);
            toast(isNew ? 'تمت إضافة السؤال' : 'تم حفظ التعديلات');
          }}
        />
      )}

      <Dialog
        open={!!del}
        onClose={() => setDel(null)}
        labelledBy="dl-h"
        role="alertdialog"
        body={
          <>
            <h2 id="dl-h">هل تريد حذف هذا السؤال؟</h2>
            <p className="muted">«{del?.question}». لن يستخدم هُدهُد هذا الجواب بعد الآن. لإيقافه مؤقتاً، استخدم مفتاح «مفعّل» بدلاً من الحذف.</p>
          </>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDel(null)}>
              لا، تراجع
            </button>
            <button type="button" className="btn btn-danger" onClick={remove}>
              احذف
            </button>
          </>
        }
      />
    </main>
  );
}
