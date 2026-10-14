'use client';

import { useState } from 'react';
import Drawer from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { FAQ_CATEGORIES, type FaqCategory } from '@/lib/constants';
import type { FaqDTO } from '@/lib/types';

/** Add / edit one FAQ. The preview chat is local only and never saved or sent. */
export default function FaqDrawer({ faq, prefill, onClose, onSaved }: { faq: FaqDTO | null; prefill?: { question: string; key: string } | null; onClose: () => void; onSaved: (f: FaqDTO, isNew: boolean) => void }) {
  const toast = useToast();
  const isNew = !faq;
  const [q, setQ] = useState(faq?.question ?? prefill?.question ?? '');
  const [a, setA] = useState(faq?.answer ?? '');
  const [cat, setCat] = useState<FaqCategory>(faq?.category ?? 'general');
  const [on, setOn] = useState(faq?.enabled ?? true);
  const [alts, setAlts] = useState<string[]>(faq?.alts ?? []);
  const [newAlt, setNewAlt] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const qErr = touched && !q.trim();
  const aErr = touched && !a.trim();
  const len = a.length;

  async function save() {
    if (!q.trim() || !a.trim() || len > 500) {
      setTouched(true);
      return;
    }
    const body = { question: q.trim(), answer: a.trim(), category: cat, enabled: on, alts, ...(isNew && prefill ? { templateKey: prefill.key } : {}) };
    setSaving(true);
    try {
      const saved = isNew ? await api<FaqDTO>('POST', '/api/app/faqs', body) : await api<FaqDTO>('PATCH', `/api/app/faqs/${faq.id}`, body);
      onSaved(saved, isNew);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      labelledBy="ed-h"
      head={
        <>
          <h2 id="ed-h" className="grow" style={{ fontSize: 19 }}>
            {isNew ? 'سؤال جديد' : 'تعديل السؤال'}
          </h2>
          <button type="button" className="ib" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </>
      }
      foot={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: '1 1 auto' }}>
            {saving && <span className="spin" />}
            {isNew ? 'أضف السؤال' : 'احفظ التعديلات'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="e-q">
          السؤال <span className="req" aria-hidden="true">*</span>
        </label>
        <input id="e-q" className={qErr ? 'input bad' : 'input'} value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثلاً: هل تستقبلون حجوزات بدون موعد؟" aria-required="true" />
        {qErr && <span className="err">اكتب السؤال</span>}
      </div>
      <div className="field">
        <label htmlFor="e-a">
          الجواب <span className="req" aria-hidden="true">*</span>
        </label>
        <textarea id="e-a" className={aErr || len > 500 ? 'input bad' : 'input'} value={a} onChange={(e) => setA(e.target.value)} placeholder="اكتب الجواب كما تريد أن يصل إلى العميل" aria-required="true" style={{ minHeight: 120 }} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          {aErr ? <span className="err">اكتب الجواب</span> : <span className="hint">الأجوبة القصيرة والواضحة أفضل في واتساب.</span>}
          <span className={len > 500 ? 'err' : 'hint'}>{len}/500</span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="e-c">التصنيف</label>
        <select id="e-c" className="input" value={cat} onChange={(e) => setCat(e.target.value as FaqCategory)}>
          {FAQ_CATEGORIES.map((c) => (
            <option key={c.k} value={c.k}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <span className="lbl">
          صيغ أخرى للسؤال <span className="opt">(اختياري، تساعد هُدهُد على التعرّف على السؤال)</span>
        </span>
        <div className="alts">
          {alts.map((t, i) => (
            <span key={`${t}${i}`} className="alt">
              {t}
              <button type="button" className="ib sm" onClick={() => setAlts(alts.filter((_, k) => k !== i))} aria-label={`حذف الصيغة: ${t}`}>
                <Icon name="close" size="sm" />
              </button>
            </span>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <label htmlFor="e-alt" className="sr-only">
            صيغة جديدة
          </label>
          <input
            id="e-alt"
            className="input"
            value={newAlt}
            onChange={(e) => setNewAlt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (newAlt.trim() && alts.length < 10) (setAlts([...alts, newAlt.trim()]), setNewAlt(''));
              }
            }}
            placeholder="مثلاً: متى تفتحون؟"
            style={{ flex: '1 1 auto' }}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (!newAlt.trim() || alts.length >= 10) return;
              setAlts([...alts, newAlt.trim()]);
              setNewAlt('');
            }}
          >
            إضافة
          </button>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid #E6E9F0', borderRadius: 12 }}>
        <span>
          <b style={{ display: 'block' }}>مفعّل</b>
          <span className="subtle">عند إيقافه، لا يستخدم هُدهُد هذا الجواب</span>
        </span>
        <button type="button" className={on ? 'sw on' : 'sw'} role="switch" aria-checked={on} aria-label="مفعّل" onClick={() => setOn(!on)} />
      </div>
      <div className="field">
        <span className="lbl">
          معاينة <span className="opt">(للتجربة فقط، لا تُحفظ)</span>
        </span>
        <div className="chat" style={{ background: '#EFEAE2', borderRadius: 12, padding: 14 }}>
          <div className="msg in">{q.trim() || 'اكتب السؤال لترى المعاينة'}</div>
          <div className="msg ai">
            <div className="who">هُدهُد</div>
            {a.trim() || 'سيظهر جوابك هنا كما سيرسله هُدهُد.'}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
