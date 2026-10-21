'use client';

import { useState } from 'react';
import WhatsAppConnect from '@/components/onboarding/WhatsAppConnect';
import Dialog from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import RadioCard from '@/components/ui/RadioCard';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { fullDate } from '@/lib/format';
import type { AccountData } from '@/lib/server/loaders/account';
import type { WaState } from '@/lib/types';

export default function AccountWhatsApp({ data, state, onChanged }: { data: AccountData; state: WaState; onChanged: () => void }) {
  const toast = useToast();
  const wa = data.wa;
  const [src, setSrc] = useState(data);
  const [after, setAfter] = useState(data.info.afterHours);
  if (src !== data) {
    setSrc(data);
    setAfter(data.info.afterHours);
  }
  const [disc, setDisc] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      onChanged();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setBusy(false);
      setDisc(false);
    }
  }

  async function pickAfter(v: 'reply' | 'away') {
    const prev = after;
    setAfter(v);
    try {
      await api('PATCH', '/api/app/account', { afterHours: v });
      toast('حُفظ الإعداد');
    } catch (e) {
      setAfter(prev);
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  const daysLeft = wa?.tokenExpiresAt ? Math.max(0, Math.ceil((new Date(wa.tokenExpiresAt).getTime() - new Date(data.now).getTime()) / 86400000)) : 0;

  return (
    <div className="col" style={{ gap: 20 }}>
      {state === 'on' && wa && (
        <section className="card" aria-labelledby="wa-h">
          <div className="card-head">
            <div className="row" style={{ gap: 12 }}>
              <span className="ic brand" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="chat" size="lg" />
              </span>
              <div>
                <h2 id="wa-h">واتساب متصل</h2>
                <span className="subtle">يستقبل هُدهُد رسائل عملائك ويرد عليها من هذا الرقم</span>
              </div>
            </div>
            <span className="bdg success">متصل</span>
          </div>
          <div className="card-body">
            <dl className="kv">
              <dt>الرقم</dt>
              <dd className="ltr num" style={{ textAlign: 'right' }}>
                {wa.phone}
              </dd>
              <dt>الاسم الظاهر للعملاء</dt>
              <dd>{wa.displayName}</dd>
              <dt>نوع الحساب</dt>
              <dd>{wa.provider === 'wasender' ? 'جهاز مرتبط · ربط تجريبي' : 'واتساب للأعمال · عبر Meta'}</dd>
              {wa.connectedAt && (
                <>
                  <dt>متصل منذ</dt>
                  <dd>{fullDate(wa.connectedAt)}</dd>
                </>
              )}
              {wa.provider === 'wasender' ? (
                <>
                  <dt>آخر رسالة مستلمة</dt>
                  <dd>{wa.lastInboundAt ? fullDate(wa.lastInboundAt) : <span className="subtle">لم تصل رسائل بعد</span>}</dd>
                </>
              ) : (
                <>
                  <dt>جودة الرقم</dt>
                  <dd>
                    <span className="bdg success">جيدة</span> <span className="subtle">لا توجد بلاغات أو حظر من العملاء</span>
                  </dd>
                </>
              )}
              <dt>رسائل هذا الشهر</dt>
              <dd className="num">
                {data.messagesThisMonth.toLocaleString('en-US')} رسالة <span className="subtle">(أعداد فقط، لا تُحفظ النصوص)</span>
              </dd>
            </dl>
          </div>
          <div className="card-foot">
            <a className="btn btn-secondary btn-sm" href="/dashboard/ai">
              اختبر الاتصال
            </a>
            <button type="button" className="btn btn-danger-soft btn-sm" onClick={() => setDisc(true)}>
              افصل الرقم
            </button>
          </div>
        </section>
      )}

      {state === 'warn' && wa && (
        <section className="card" aria-labelledby="ww-h" style={{ borderColor: '#F5C98B' }}>
          <div className="card-head">
            <div className="row" style={{ gap: 12 }}>
              <span className="ic warn" style={{ display: 'grid', placeItems: 'center' }}>
                <Icon name="alert" size="lg" />
              </span>
              <div>
                <h2 id="ww-h">الاتصال يحتاج إلى انتباه</h2>
                <span className="subtle ltr num">{wa.phone}</span>
              </div>
            </div>
            <span className="bdg warning">يحتاج إلى انتباه</span>
          </div>
          <div className="card-body col" style={{ gap: 12 }}>
            <div className="alert warning">
              <span>
                <b>{daysLeft > 0 ? `تنتهي صلاحية الربط مع Meta خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : daysLeft === 2 ? 'يومين' : daysLeft <= 10 ? 'أيام' : 'يوماً'}.` : 'انتهت صلاحية الربط مع Meta.'}</b> أعد تسجيل الدخول إلى حسابك في Meta لتجديده.
                {daysLeft > 0 && ' حتى ذلك الحين يعمل هُدهُد كالمعتاد.'}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>
              إذا انتهت الصلاحية، يتوقف هُدهُد عن الرد إلى أن تجدّد الربط. لن تُفقد أي طلبات أو حجوزات.
            </p>
          </div>
          <div className="card-foot">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(() => api('POST', '/api/app/whatsapp/renew'), 'جُدّد الربط مع Meta لمدة 60 يوماً')}>
              {busy && <span className="spin" />}
              جدّد الربط الآن
            </button>
          </div>
        </section>
      )}

      {state === 'off' && (
        <section className="card empty" aria-labelledby="wo-h">
          <span className="ic neutral" style={{ display: 'grid', placeItems: 'center' }}>
            <Icon name="waOff" size="xl" />
          </span>
          <h2 id="wo-h">واتساب غير متصل</h2>
          <p className="muted">لا يستطيع هُدهُد الرد على عملائك حتى تربط رقم واتساب للأعمال. يستغرق الربط نحو 5 دقائق.</p>
          {!connecting && (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setConnecting(true)}>
                اربط رقم واتساب
              </button>
              <span className="subtle">{data.waProvider === 'wasender' ? 'ستحتاج إلى هاتفك الذي يعمل عليه واتساب لمسح رمز الربط.' : 'ستحتاج إلى حسابك في فيسبوك، ورقم يمكنه استقبال رمز تحقق.'}</span>
            </>
          )}
          {connecting && (
            <div style={{ width: '100%', maxWidth: 520, textAlign: 'start' }}>
              <WhatsAppConnect
                provider={data.waProvider}
                defaultPhone={data.info.phone}
                onConnected={() => {
                  toast('رُبط رقم واتساب');
                  onChanged();
                }}
              />
            </div>
          )}
        </section>
      )}

      <section className="card" aria-labelledby="bh-h">
        <div className="card-head">
          <div>
            <h2 id="bh-h">الرد خارج أوقات العمل</h2>
            <span className="subtle">أوقات العمل من صفحة الحجوزات</span>
          </div>
        </div>
        <div className="card-body col" style={{ gap: 8 }} role="radiogroup" aria-labelledby="bh-h">
          <RadioCard name="after" checked={after === 'reply'} onChange={() => pickAfter('reply')} title="يرد هُدهُد كالمعتاد" desc="يجيب عن الأسئلة ويسجّل الطلبات، ويخبر العميل بأن الفريق سيتابع في أوقات العمل." />
          <RadioCard name="after" checked={after === 'away'} onChange={() => pickAfter('away')} title="يرسل رسالة غياب فقط" desc="«شكراً لتواصلك! نحن خارج أوقات العمل، وسنرد عليك صباح الغد.»" />
        </div>
      </section>

      <Dialog
        open={disc}
        onClose={() => setDisc(false)}
        labelledBy="dc-h"
        role="alertdialog"
        body={
          <div className="col" style={{ gap: 12 }}>
            <h2 id="dc-h">فصل رقم واتساب؟</h2>
            <p className="muted">
              سيتوقف هُدهُد فوراً عن الرد على عملائك من الرقم <span className="ltr num">{wa?.phone}</span>. تبقى الطلبات والحجوزات ومعلومات نشاطك محفوظة، ويمكنك إعادة الربط لاحقاً.
            </p>
          </div>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setDisc(false)}>
              لا، أبقِه متصلاً
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => run(() => api('POST', '/api/app/whatsapp/disconnect'), 'فُصل رقم واتساب، وتوقف هُدهُد عن الرد')}>
              {busy && <span className="spin" />}
              افصل الرقم
            </button>
          </>
        }
      />
    </div>
  );
}
