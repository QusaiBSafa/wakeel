/* eslint-disable @next/next/no-img-element -- the QR is a data URL from our own API */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client/api';

type Pair = { status: 'none' | 'need_scan' | 'connecting' | 'connected'; qr?: string; phone?: string };
type Phase = 'idle' | 'starting' | 'qr' | 'done';

const POLL_MS = 3000;
const STEPS = ['اكتب رقم واتساب الذي سيرد منه هُدهُد.', 'افتح واتساب على هاتفك، ثم «الأجهزة المرتبطة» ← «ربط جهاز».', 'وجّه الكاميرا إلى الرمز الذي سيظهر هنا.'];

/** Linked-device connect flow (WasenderAPI): the owner scans a QR with their own phone; nobody else is involved. */
export default function WhatsAppQrConnect({ connectedPhone, defaultPhone, onConnected }: { connectedPhone?: string | null; defaultPhone?: string; onConnected?: (phone: string) => void }) {
  const [phase, setPhase] = useState<Phase>(connectedPhone ? 'done' : 'idle');
  const [phone, setPhone] = useState(connectedPhone || defaultPhone || '');
  const [qr, setQr] = useState('');
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState('');
  const done = useRef(onConnected);
  useEffect(() => {
    done.current = onConnected;
  });

  // While the QR is on screen, poll: the server refreshes the QR and reports `connected` once scanned.
  useEffect(() => {
    if (phase !== 'qr') return;
    let stop = false;
    let failures = 0;
    const tick = async () => {
      try {
        const r = await api<Pair>('GET', '/api/app/whatsapp/pair');
        failures = 0;
        if (stop) return;
        if (r.status === 'connected') {
          setPhase('done');
          done.current?.(r.phone || phone);
          return;
        }
        if (r.status === 'none') {
          setPhase('idle');
          setErr('انتهت مهلة الربط. ابدأ من جديد.');
          return;
        }
        setLinking(r.status === 'connecting');
        if (r.qr) setQr(r.qr);
      } catch {
        if (++failures >= 3 && !stop) setErr('تعذّر تحديث الرمز. تحقّق من الإنترنت.');
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [phase, phone]);

  async function start() {
    setErr('');
    setPhase('starting');
    try {
      const r = await api<Pair>('POST', '/api/app/whatsapp/pair', { phone });
      if (r.status === 'connected') {
        setPhase('done');
        onConnected?.(r.phone || phone);
        return;
      }
      setQr(r.qr || '');
      setLinking(false);
      setPhase('qr');
    } catch (e) {
      setPhase('idle');
      setErr(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة');
    }
  }

  async function cancel() {
    setPhase('idle');
    setQr('');
    await api('DELETE', '/api/app/whatsapp/pair').catch(() => {});
  }

  return (
    <div className="card card-body col" style={{ gap: 16 }}>
      {(phase === 'idle' || phase === 'starting') && (
        <>
          <ol className="col" style={{ gap: 10, paddingInlineStart: 0 }}>
            {STEPS.map((t, i) => (
              <li key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span className="count brand">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="wa-phone">رقم واتساب</label>
            <input
              id="wa-phone"
              className={err ? 'input bad' : 'input'}
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+970 59 123 4567"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErr('');
              }}
            />
            {err && (
              <span className="err" role="alert">
                {err}
              </span>
            )}
          </div>
          <div className="alert warning">
            <span>
              <b>ربط تجريبي.</b> يرتبط هُدهُد برقمك كجهاز مرتبط، مثل واتساب ويب. استخدم رقماً مخصصاً للتجربة، فقد يقيّد واتساب الأرقام التي ترسل رسائل آلية.
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={start} disabled={phase === 'starting' || !phone.trim()} style={{ alignSelf: 'flex-start' }}>
            {phase === 'starting' ? <span className="spin" /> : <Icon name="chat" />}
            اعرض رمز الربط
          </button>
        </>
      )}
      {phase === 'qr' && (
        <>
          <div className="row" style={{ gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 240, height: 240, display: 'grid', placeItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', flex: 'none' }}>
              {qr ? <img src={qr} alt="رمز ربط واتساب" width={224} height={224} style={{ opacity: linking ? 0.25 : 1 }} /> : <span className="spin dk" />}
            </div>
            <div className="col" style={{ gap: 10, flex: '1 1 220px' }} aria-live="polite">
              <b>{linking ? 'جارٍ الربط…' : 'امسح الرمز من هاتفك'}</b>
              <span className="muted">
                افتح واتساب على الرقم <span className="ltr num">{phone}</span>، ثم «الإعدادات» ← «الأجهزة المرتبطة» ← «ربط جهاز»، ووجّه الكاميرا إلى الرمز.
              </span>
              <span className="subtle">يتجدّد الرمز تلقائياً كل بضع ثوانٍ. أبقِ هذه الصفحة مفتوحة حتى يكتمل الربط.</span>
              {err && (
                <span className="err" role="alert">
                  {err}
                </span>
              )}
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancel} style={{ alignSelf: 'flex-start' }}>
                إلغاء
              </button>
            </div>
          </div>
        </>
      )}
      {phase === 'done' && (
        <div className="alert success">
          <Icon name="check" />
          <span>
            <b>تم ربط واتساب.</b> الرقم <span className="ltr num">{phone}</span> متصل، وستصل رسائل عملائك إلى هُدهُد.
          </span>
        </div>
      )}
    </div>
  );
}
