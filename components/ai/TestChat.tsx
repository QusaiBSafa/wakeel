'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { aiReply, type AiChatCtx, type ChatMsg } from '@/lib/client/test-chat';

const PRESETS = ['متى تفتحون؟', 'كم سعر الخدمة؟', 'أريد حجز موعد غداً', 'هل يوجد خصم؟', 'Do you open on Friday?'];
const START: ChatMsg[] = [{ k: 'sys', text: 'اكتب رسالة أو اختر واحدة من الأسفل لترى كيف سيرد هُدهُد.' }];

/** «جرّب هُدهُد»: runs entirely in the browser with the current, unsaved settings. It never calls the server. */
export default function TestChat({ ctx }: { ctx: AiChatCtx }) {
  const [chat, setChat] = useState<ChatMsg[]>(START);
  const [draft, setDraft] = useState('');
  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setChat((c) => [...c, { k: 'in', text: t }, ...aiReply(t, ctx)]);
    setDraft('');
  };
  const who = ctx.cfg.name.trim() || 'هُدهُد';
  return (
    <aside className="card" aria-labelledby="ts-h" style={{ position: 'sticky', top: 16, overflow: 'hidden' }}>
      <div className="card-head">
        <div>
          <h2 id="ts-h">جرّب هُدهُد</h2>
          <span className="subtle">بالإعدادات الحالية، قبل الحفظ</span>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChat(START)}>
          ابدأ من جديد
        </button>
      </div>
      <div className="chat" style={{ background: '#EFEAE2', padding: 14, minHeight: 300, maxHeight: 420, overflowY: 'auto', flexDirection: 'column-reverse', justifyContent: 'flex-start' }} aria-live="polite">
        {chat
          .slice()
          .reverse()
          .map((m, i) => (
            <div key={`${chat.length - i}`} className={m.k === 'in' ? 'msg in' : m.k === 'ai' ? 'msg ai' : 'sysn'}>
              {m.k === 'ai' && <div className="who">{who}</div>}
              {m.text}
            </div>
          ))}
      </div>
      <div className="card-body col" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label="رسائل جاهزة للتجربة">
          {PRESETS.map((p) => (
            <button key={p} type="button" className="chip sm" onClick={() => send(p)}>
              {p}
            </button>
          ))}
        </div>
        <form
          className="row"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <label htmlFor="t-in" className="sr-only">
            اكتب رسالة تجريبية
          </label>
          <input id="t-in" className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="اكتب كأنك عميل…" style={{ flex: '1 1 auto' }} />
          <button type="submit" className="btn btn-primary" aria-label="أرسل الرسالة التجريبية">
            <Icon name="send" style={{ transform: 'scaleX(-1)' }} />
          </button>
        </form>
        <p className="subtle row" style={{ gap: 6, alignItems: 'flex-start', fontSize: 12.5 }}>
          <Icon name="shield" size="sm" style={{ flex: 'none', marginTop: 2 }} />
          <span>تجربة فقط: لا تُرسل إلى أي عميل، ولا تُحفظ بعد مغادرة الصفحة.</span>
        </p>
      </div>
    </aside>
  );
}
