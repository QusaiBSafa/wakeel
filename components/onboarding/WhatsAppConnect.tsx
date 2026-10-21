'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client/api';
import WhatsAppQrConnect from './WhatsAppQrConnect';

type Phase = 'idle' | 'busy' | 'pick' | 'code' | 'done';
type Num = { phone: string; desc: string };

type Props = { connectedPhone?: string | null; defaultPhone?: string; provider?: 'stub' | 'wasender'; onConnected?: (phone: string) => void };

/** Used by onboarding step 7 and the account page. With the wasender provider: the QR flow; otherwise the stub. */
export default function WhatsAppConnect({ provider = 'stub', ...props }: Props) {
  return provider === 'wasender' ? <WhatsAppQrConnect {...props} /> : <StubConnect {...props} />;
}

/** STUB of the Meta connect flow: start → pick a number → code → done. */
function StubConnect({ connectedPhone, onConnected }: Props) {
  const [phase, setPhase] = useState<Phase>(connectedPhone ? 'done' : 'idle');
  const [numbers, setNumbers] = useState<Num[]>([]);
  const [pick, setPick] = useState(0);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [phone, setPhone] = useState(connectedPhone || '');
  const [verifying, setVerifying] = useState(false);

  async function start() {
    setPhase('busy');
    try {
      const [r] = await Promise.all([api<{ numbers: Num[] }>('POST', '/api/app/whatsapp/connect/start'), new Promise((res) => setTimeout(res, 1100))]);
      setNumbers(r.numbers);
      setPick(0);
      setPhase('pick');
    } catch (e) {
      setPhase('idle');
      setErr(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة');
    }
  }

  async function verify() {
    if (code.length !== 6) {
      setErr('الرمز مكوّن من 6 أرقام');
      return;
    }
    setVerifying(true);
    try {
      await api('POST', '/api/app/whatsapp/connect/verify', { phone: numbers[pick].phone, code });
      setPhone(numbers[pick].phone);
      setPhase('done');
      onConnected?.(numbers[pick].phone);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="card card-body col" style={{ gap: 16 }}>
      {phase === 'idle' && (
        <>
          <ol className="col" style={{ gap: 10, paddingInlineStart: 0 }}>
            {['سجّل الدخول بحساب فيسبوك الذي يدير نشاطك.', 'اختر رقم واتساب للأعمال، أو أضف رقماً جديداً.', 'أدخل رمز التحقق الذي يصلك على الرقم.'].map((t, i) => (
              <li key={t} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span className="count brand">{i + 1}</span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
          <div className="alert info">
            <span>إذا كان الرقم مستخدماً في تطبيق واتساب العادي، ستحتاج إلى نقله إلى واتساب للأعمال أولاً.</span>
          </div>
          {err && (
            <span className="err" role="alert">
              {err}
            </span>
          )}
          <button type="button" className="btn btn-primary" onClick={start} style={{ alignSelf: 'flex-start' }}>
            <Icon name="chat" />
            تابع مع Meta
          </button>
        </>
      )}
      {phase === 'busy' && (
        <div className="row" style={{ gap: 12 }} aria-live="polite">
          <span className="spin dk" />
          <span>جارٍ الاتصال بحسابك في Meta…</span>
        </div>
      )}
      {phase === 'pick' && (
        <>
          <fieldset className="col" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 8 }}>
              اختر الرقم الذي سيرد منه هُدهُد
            </legend>
            {numbers.map((n, i) => (
              <label key={n.phone} className={pick === i ? 'radio-card on' : 'radio-card'}>
                <input type="radio" name="wanum" checked={pick === i} onChange={() => setPick(i)} />
                <span>
                  <b className="ltr" style={{ textAlign: 'right' }}>
                    {n.phone}
                  </b>
                  <span className="subtle">{n.desc}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setCode('');
              setErr('');
              setPhase('code');
            }}
          >
            أرسل رمز التحقق
          </button>
        </>
      )}
      {phase === 'code' && (
        <>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="o-code">
              رمز التحقق المرسل إلى <span className="ltr num">{numbers[pick]?.phone}</span>
            </label>
            <input
              id="o-code"
              className={err ? 'input bad' : 'input'}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setErr('');
              }}
              placeholder="••••••"
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
            />
            {err && <span className="err">{err}</span>}
            <span className="hint">لم يصلك؟ يمكنك طلب رمز جديد بعد 0:42. (للتجربة: أي 6 أرقام عدا 000000)</span>
          </div>
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={verify} disabled={verifying}>
            {verifying && <span className="spin" />}
            تحقّق
          </button>
        </>
      )}
      {phase === 'done' && (
        <div className="alert success">
          <Icon name="check" />
          <span>
            <b>تم ربط واتساب.</b> الرقم <span className="ltr num">{phone}</span> جاهز. لن يبدأ هُدهُد بالرد قبل أن تفعّله في الخطوة الأخيرة.
          </span>
        </div>
      )}
    </div>
  );
}
