'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Icon, WhatsAppIcon } from '@/components/ui/Icon';
import Seg from '@/components/ui/Seg';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { telLink, waitText, waLink } from '@/lib/format';
import type { AttentionData } from '@/lib/server/loaders/attention';
import type { AttentionDTO } from '@/lib/types';

type Item = AttentionDTO;

function Card({ a, now, onResolve, onReplied }: { a: Item; now: number; onResolve: () => void; onReplied: (resume: boolean) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'write' | 'instruct'>('write');
  const [text, setText] = useState('');
  const [instr, setInstr] = useState('');
  const [resume, setResume] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(false);
  const write = mode === 'write';
  const first = (a.customerName || '').split(' ')[0] || 'العميل';
  const sent = a.status === 'replied';

  async function send() {
    const body = (write ? text : instr).trim();
    if (!body) {
      setErr(true);
      return;
    }
    setSending(true);
    try {
      await api('POST', `/api/app/attention/${a.id}/reply`, { mode, text: body, resume });
      // the text never outlives this call: clear it right away
      setText('');
      setInstr('');
      setOpen(false);
      onReplied(resume);
      toast(resume ? `تم إرسال الرد إلى ${first}، وسيتابع هُدهُد معه` : 'تم إرسال الرد. هُدهُد متوقف مع هذا العميل لحد ما تحل الطلب');
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSending(false);
    }
  }

  const refHref = a.refKind === 'order' ? `/dashboard/orders?id=${a.refId}` : `/dashboard/bookings?id=${a.refId}`;
  return (
    <li id={`a-${a.id}`} className={open ? 'card attn' : 'card'}>
      <div style={{ display: 'flex', gap: 14, padding: '16px 18px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Avatar name={a.customerName || a.customerPhone} size="lg" />
        <div className="grow" style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: '4px 10px' }}>
            <h2 style={{ fontSize: 16 }}>{a.customerName || 'عميل'}</h2>
            <a className="ltr num tap" href={telLink(a.customerPhone)} style={{ fontSize: 14 }}>
              {a.customerPhone}
            </a>
          </div>
          <div className="reason" style={{ fontSize: 14.5 }}>
            <Icon name="info" size="sm" />
            {a.reason}
          </div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span className="bdg outline">
              <Icon name="clock" size={13} />
              ينتظر منذ {waitText(now - new Date(a.createdAt).getTime())}
            </span>
            {a.refKind && a.refId && a.refLabel && (
              <Link className="bdg info" href={refHref} style={{ textDecoration: 'none' }}>
                {a.refLabel}
              </Link>
            )}
            {sent && a.hodhodPaused && (
              <span className="bdg info">
                <span className="dot" />
                هُدهُد متوقف مع هذا العميل
              </span>
            )}
          </div>
        </div>
        {!sent ? (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {!open && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)} aria-expanded="false">
                ردّ
              </button>
            )}
            <a className="btn btn-secondary btn-sm" href={waLink(a.customerPhone)} target="_blank" rel="noopener" aria-label={`افتح محادثة ${a.customerName || a.customerPhone} في واتساب`}>
              <WhatsAppIcon />
              افتح في واتساب
            </a>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onResolve}>
              <Icon name="check" size="sm" />
              تم الحل
            </button>
          </div>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <span className="bdg success">
              <Icon name="check" size={13} />
              تم إرسال الرد
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onResolve}>
              تم الحل
            </button>
          </div>
        )}
      </div>

      {open && !sent && (
        <div style={{ borderTop: '1px solid #F3C886', background: '#FFFBF3', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, borderRadius: '0 0 16px 16px' }}>
          <Seg
            label="طريقة الرد"
            style={{ alignSelf: 'flex-start' }}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErr(false);
            }}
            options={[
              { value: 'write', label: 'اكتب الرد بنفسك' },
              { value: 'instruct', label: 'أعطِ هُدهُد تعليمات' },
            ]}
          />
          {write ? (
            <>
              <div className="field">
                <label htmlFor={`reply-${a.id}`}>ردّك على {first}</label>
                <textarea
                  id={`reply-${a.id}`}
                  className={err ? 'input bad' : 'input'}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setErr(false);
                  }}
                  placeholder="اكتب الرد كما تريد أن يصل إلى العميل"
                />
                {err && <span className="err">اكتب الرد قبل إرساله</span>}
              </div>
              {a.suggestion && (
                <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                  <span className="subtle">اقتراح هُدهُد:</span>
                  <button
                    type="button"
                    className="chip sm"
                    onClick={() => {
                      setText(a.suggestion!);
                      setErr(false);
                    }}
                  >
                    {a.suggestion}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="field">
              <label htmlFor={`instr-${a.id}`}>ماذا تريد أن يقول هُدهُد؟</label>
              <input
                id={`instr-${a.id}`}
                className={err ? 'input bad' : 'input'}
                value={instr}
                onChange={(e) => {
                  setInstr(e.target.value);
                  setErr(false);
                }}
                placeholder="مثلاً: اعتذر للعميل واعرض عليه حلاً"
              />
              <span className="hint">يكتب هُدهُد الرد بأسلوبك ويرسله، ثم يتابع المحادثة.</span>
              {err && <span className="err">اكتب التعليمات أولاً</span>}
            </div>
          )}
          <label className="row" style={{ gap: 10, fontSize: 14, cursor: 'pointer', minHeight: 40 }}>
            <input type="checkbox" checked={resume} onChange={() => setResume(!resume)} style={{ width: 18, height: 18, accentColor: '#0B7F58' }} />
            <span>دع هُدهُد يتابع مع العميل بعد ردّي</span>
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>
              {sending && <span className="spin" />}
              {sending ? 'جارٍ الإرسال…' : write ? 'أرسل الرد' : 'دع هُدهُد يرد'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setOpen(false);
                setErr(false);
              }}
            >
              إلغاء
            </button>
            <span className="subtle grow" style={{ textAlign: 'left' }}>
              يُرسَل من رقم واتساب نشاطك
            </span>
          </div>
        </div>
      )}
    </li>
  );
}

export default function AttentionClient({ data }: { data: AttentionData }) {
  const router = useRouter();
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [items, setItems] = useState(data.items);
  const [resolved, setResolved] = useState(data.resolvedToday);
  if (src !== data) {
    setSrc(data);
    setItems(data.items);
    setResolved(data.resolvedToday);
  }
  const [tab, setTab] = useState<'open' | 'done'>('open');
  const [confirm, setConfirm] = useState<Item | null>(null);
  const now = new Date(data.now).getTime();

  // /dashboard/attention#a-<id> scrolls to the card
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    const el = id ? document.getElementById(id) : null;
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.style.boxShadow = '0 0 0 3px var(--secondary)';
    }
  }, []);

  async function resolve() {
    const a = confirm;
    if (!a) return;
    try {
      await api('DELETE', `/api/app/attention/${a.id}`);
      setItems((x) => x.filter((i) => i.id !== a.id));
      setResolved((n) => n + 1);
      setConfirm(null);
      toast('تم الحل وحُذفت التفاصيل');
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  return (
    <main className="page" id="main" style={{ maxWidth: 980 }} data-clarity-mask="true">
      <div className="page-head">
        <div className="t">
          <h1>تحتاج تدخلك</h1>
          <p>يتوقف هُدهُد ويطلب رأيك عند الحاجة فقط. ردّ على العميل من هنا، أو افتح المحادثة في واتساب.</p>
        </div>
      </div>

      <div className="row" style={{ gap: 10, padding: '10px 14px', borderRadius: 12, background: '#EEF0F3', color: '#4A5468', fontSize: 13.5, alignItems: 'flex-start' }}>
        <Icon name="lock" size="sm" />
        <span>حمايةً لخصوصية عملائك، لا يحفظ هُدهُد محتوى المحادثات ولا يعرضه. يظهر لك سبب التحويل ورقم العميل فقط، ويُحذف الطلب من هنا عند حلّه.</span>
      </div>

      <div className="toolbar" role="tablist" aria-label="فلترة الطلبات">
        {(
          [
            ['open', 'مفتوحة', items.length, 'count hot'],
            ['done', 'تم حلها اليوم', resolved, 'count'],
          ] as const
        ).map(([k, label, n, cls]) => (
          <button key={k} type="button" role="tab" className={tab === k ? 'chip on' : 'chip'} aria-selected={tab === k} onClick={() => setTab(k)}>
            {label}
            <span className={cls} style={{ height: 20, minWidth: 20, fontSize: 11.5 }}>
              {n}
            </span>
          </button>
        ))}
      </div>

      {tab === 'open' && items.length === 0 && (
        <EmptyState title="لا يوجد ما ينتظرك" text="لا يوجد عميل بانتظارك الآن. عندما يحتاج هُدهُد إلى رأيك، سيظهر الطلب هنا وسيصلك تنبيه.">
          <Link className="btn btn-secondary btn-sm" href="/dashboard/ai">
            متى يحوّل هُدهُد المحادثات إليك؟
          </Link>
        </EmptyState>
      )}
      {tab === 'done' && <EmptyState icon="check" tone="neutral" title={`حللت ${resolved} طلبات اليوم`} text="تُحذف تفاصيل الطلبات المحلولة تلقائياً، لذلك لا تظهر هنا." />}
      {tab === 'open' && items.length > 0 && (
        <ul className="col" style={{ gap: 14 }}>
          {items.map((a) => (
            <Card
              key={a.id}
              a={a}
              now={now}
              onResolve={() => setConfirm(a)}
              onReplied={(resume) => setItems((x) => x.map((i) => (i.id === a.id ? { ...i, status: 'replied', hodhodPaused: !resume } : i)))}
            />
          ))}
        </ul>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        labelledBy="rs-h"
        describedBy="rs-d"
        role="alertdialog"
        body={
          <>
            <h2 id="rs-h">هل تريد اعتبار طلب {confirm?.customerName || 'العميل'} محلولاً؟</h2>
            <p id="rs-d" className="muted">
              سيُزال من القائمة وتُحذف تفاصيله، وسيعود هُدهُد للرد على هذا العميل تلقائياً.
            </p>
          </>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(null)}>
              ليس بعد
            </button>
            <button type="button" className="btn btn-primary" onClick={resolve}>
              نعم، تم الحل
            </button>
          </>
        }
      />
    </main>
  );
}
