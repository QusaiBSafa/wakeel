'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useShell } from '@/components/shell/ShellContext';
import Badge from '@/components/ui/Badge';
import Dialog from '@/components/ui/Dialog';
import { Icon, type IconName } from '@/components/ui/Icon';
import Logo from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';
import { BOOKING_STATUS, ORDER_STATUS } from '@/lib/constants';
import { agoText, clock, formatMoney, relDay, waitText } from '@/lib/format';
import { minutesOf } from '@/lib/time';
import { api, ApiError } from '@/lib/client/api';
import type { HomeData } from '@/lib/server/loaders/home';
import Avatar from '@/components/ui/Avatar';

const ICON_BOX = { width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center' } as const;

export default function HomeClient({ data, greeting, dateLine }: { data: HomeData; greeting: string; dateLine: string }) {
  const shell = useShell();
  const router = useRouter();
  const toast = useToast();
  const [confirmPause, setConfirmPause] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = new Date(data.now).getTime();
  const isNew = !shell.business.onboardingDone;
  const sections = shell.business.sections;
  const { stats } = data;

  async function call(path: string, body: unknown, ok: string) {
    setBusy(true);
    try {
      await api('POST', path, body);
      toast(ok);
      setConfirmPause(false);
      router.refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setBusy(false);
    }
  }

  const oldest = data.oldestAttentionAt ? waitText(now - new Date(data.oldestAttentionAt).getTime()) : '';
  const next = data.upcoming.find((b) => new Date(b.startsAt).getTime() > now) ?? null;
  const cards: { label: string; value: number; note: string; icon: IconName; ic: string; href: string }[] = [
    {
      label: 'محادثات اليوم',
      value: stats.conversations,
      note: isNew ? 'بعد ربط واتساب' : `ردّ هُدهُد على ${stats.autoReplied} منها تلقائياً`,
      icon: 'chatBubble',
      ic: 'ic brand',
      href: '/dashboard/ai',
    },
    { label: 'تحتاج تدخلك', value: data.attentionCount, note: data.attentionCount ? `أقدمها منذ ${oldest}` : 'لا شيء', icon: 'alert', ic: data.attentionCount ? 'ic danger' : 'ic neutral', href: '/dashboard/attention' },
    { label: 'طلبات جديدة', value: data.newOrders.count, note: data.newOrders.count ? `قيمتها ${formatMoney(data.newOrders.totalMinor)}` : '—', icon: 'bag', ic: 'ic indigo', href: '/dashboard/orders' },
    { label: 'حجوزات اليوم', value: data.bookingsToday, note: next ? `التالي ${clock(minutesOf(new Date(next.startsAt)))} · ${next.customerName}` : '—', icon: 'calendar', ic: 'ic accent', href: '/dashboard/bookings' },
  ];

  const avg = stats.replies > 0 ? Math.round(stats.replyMsTotal / stats.replies / 1000) : null;
  const activity: { label: string; value: string; icon: IconName; ic: string }[] = [
    { label: 'محادثات ردّ عليها هُدهُد تلقائياً', value: String(stats.autoReplied), icon: 'chatBubble', ic: 'ic brand' },
    { label: 'طلبات سجّلها', value: String(stats.ordersLogged), icon: 'bag', ic: 'ic indigo' },
    { label: 'حجوزات أكّدها', value: String(stats.bookingsConfirmed), icon: 'calendar', ic: 'ic accent' },
    { label: 'حُوّلت إليك', value: String(stats.handedOff), icon: 'alert', ic: 'ic warn' },
    { label: 'متوسط وقت الرد', value: avg === null ? '—' : `${avg} ثوانٍ`, icon: 'clock', ic: 'ic neutral' },
  ];
  const hasActivity = shell.wa !== 'off' || stats.conversations > 0 || stats.ordersLogged > 0 || stats.bookingsConfirmed > 0 || stats.handedOff > 0;

  const wa = data.wa;
  const { done, total } = shell.business.onboardingProgress;
  const pct = Math.round((done / total) * 100);
  const waOff = !isNew && shell.wa === 'off';
  const paused = !isNew && !waOff && !data.aiEnabled;

  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>{greeting}</h1>
          <p>{dateLine}</p>
        </div>
        <Link className="btn btn-secondary" href="/dashboard/attention">
          <Icon name="alert" />
          تحتاج تدخلك
        </Link>
      </div>

      {isNew && (
        <section className="card card-pad" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', alignItems: 'center' }}>
          <span className="ic brand" style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center' }}>
            <Logo size={30} />
          </span>
          <div className="grow" style={{ flex: '1 1 300px' }}>
            <h2>لنبدأ تشغيل هُدهُد</h2>
            <p className="muted">بقيت {total - done} خطوات قصيرة: اربط واتساب، وأضف منتجاتك، وجرّب محادثة. يمكنك التوقف والعودة في أي وقت.</p>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="bar grow" style={{ maxWidth: 320 }}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="subtle">
                {done} من {total}
              </span>
            </div>
          </div>
          <Link className="btn btn-primary" href="/onboarding">
            أكمل الإعداد
          </Link>
        </section>
      )}

      {waOff && (
        <section className="alert danger" role="alert" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="alert" />
          <div className="grow" style={{ flex: '1 1 240px' }}>
            <b>انقطع اتصال واتساب{wa?.disconnectedAt ? ` منذ الساعة ${clock(minutesOf(new Date(wa.disconnectedAt)))}` : ''}.</b> لا يستقبل هُدهُد الرسائل حالياً، ولن يصل أي رد إلى العملاء.
          </div>
          <Link className="btn btn-danger btn-sm" href="/dashboard/account">
            أعد ربط واتساب
          </Link>
        </section>
      )}

      {paused && (
        <section className="alert warning" role="status" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Icon name="pause" />
          <div className="grow" style={{ flex: '1 1 240px' }}>
            <b>هُدهُد متوقف مؤقتاً.</b> ستنتظر الرسائل الجديدة ردّك أنت.
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => call('/api/app/ai/resume', undefined, 'عاد هُدهُد إلى العمل')}>
            أعد تشغيله
          </button>
        </section>
      )}

      {!isNew && !waOff && !paused && (
        <section className="card card-pad" aria-label="حالة هُدهُد" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px 20px' }}>
          <span className="ic brand" style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center' }}>
            <Logo size={26} />
          </span>
          <div className="grow" style={{ flex: '1 1 260px' }}>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ fontSize: 18 }}>هُدهُد يعمل ويرد على عملائك</h2>
              <Badge kind="success">
                <span className="pulse" />
                يعمل تلقائياً
              </Badge>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>
              واتساب متصل على <span className="ltr num">{wa?.phone || shell.business.name}</span>
              {wa?.lastReplyAt ? ` · آخر رد ${agoText(wa.lastReplyAt, now)}` : ''}
            </p>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary btn-sm" href="/dashboard/ai">
              إعدادات هُدهُد
            </Link>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmPause(true)}>
              <Icon name="pause" size="sm" />
              إيقاف مؤقت
            </button>
          </div>
        </section>
      )}

      <section className="grid-4 keep2" aria-label="ملخص اليوم">
        {cards.map((s) => (
          <Link key={s.label} className="card stat" href={s.href} style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="lab">
              <span className={s.ic}>
                <Icon name={s.icon} />
              </span>
              {s.label}
            </span>
            <span className="val num">{s.value}</span>
            <span className="subtle">{s.note}</span>
          </Link>
        ))}
      </section>

      <div className="split">
        <div className="col" style={{ gap: 20 }}>
          <section className="attn" aria-labelledby="attn-h" data-clarity-mask="true">
            <div className="card-head" style={{ borderBottomColor: '#F3C886', background: '#FFF9EF', borderRadius: '16px 16px 0 0' }}>
              <div className="row">
                <span className="ic warn" style={ICON_BOX}>
                  <Icon name="alert" />
                </span>
                <h2 id="attn-h">تحتاج تدخلك</h2>
                <span className="count hot">{data.attentionCount}</span>
              </div>
              <Link href="/dashboard/attention" style={{ fontSize: 14 }}>
                عرض الكل
              </Link>
            </div>
            {data.attention.length > 0 ? (
              <ul>
                {data.attention.map((a) => (
                  <li className="attn-row" key={a.id}>
                    <Avatar name={a.customerName || a.customerPhone} />
                    <div className="grow">
                      <div className="row" style={{ flexWrap: 'wrap', gap: '4px 10px' }}>
                        <b>{a.customerName || 'عميل'}</b>
                        <span className="subtle ltr num">{a.customerPhone}</span>
                      </div>
                      <div className="reason">
                        <Icon name="info" size="sm" />
                        {a.reason}
                      </div>
                    </div>
                    <div className="col" style={{ alignItems: 'flex-end', gap: 6, flex: 'none' }}>
                      <span className="subtle">ينتظر منذ {waitText(now - new Date(a.createdAt).getTime())}</span>
                      <Link className="btn btn-primary btn-sm" href={`/dashboard/attention#a-${a.id}`}>
                        ردّ
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty" style={{ padding: '28px 20px' }}>
                <span className="ic brand" style={{ display: 'grid', placeItems: 'center' }}>
                  <Icon name="check" size="xl" />
                </span>
                <b>لا يوجد ما ينتظرك</b>
                <p className="muted" style={{ fontSize: 14 }}>
                  عندما يحتاج هُدهُد إلى رأيك، ستظهر الطلبات هنا فوراً.
                </p>
              </div>
            )}
          </section>

          {sections.orders !== false && (
            <section className="card" aria-labelledby="ord-h" data-clarity-mask="true">
              <div className="card-head">
                <h2 id="ord-h">آخر الطلبات</h2>
                <Link href="/dashboard/orders" style={{ fontSize: 14 }}>
                  كل الطلبات
                </Link>
              </div>
              {data.recentOrders.length > 0 ? (
                <>
                  <div className="tbl-wrap hide-m">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th scope="col">الطلب</th>
                          <th scope="col">العميل</th>
                          <th scope="col">المنتجات</th>
                          <th scope="col">الإجمالي</th>
                          <th scope="col">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="ltr num" style={{ textAlign: 'right', fontWeight: 600 }}>
                              <Link href={`/dashboard/orders?id=${o.id}`}>#{o.number}</Link>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                              <div className="subtle">{relDay(o.createdAt, now)}</div>
                            </td>
                            <td className="muted" style={{ maxWidth: 240 }}>
                              {o.itemsText}
                            </td>
                            <td className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                              {formatMoney(o.totalMinor)}
                            </td>
                            <td>
                              <div className="col" style={{ gap: 4, alignItems: 'flex-start' }}>
                                <span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span>
                                {o.isDraft && (
                                  <span className="bdg warning" style={{ fontSize: 11.5 }}>
                                    مسودة · بانتظار تأكيد العميل
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="only-m">
                    {data.recentOrders.map((o) => (
                      <li key={o.id} style={{ borderTop: '1px solid #E6E9F0' }}>
                        <Link href={`/dashboard/orders?id=${o.id}`} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', color: 'inherit', textDecoration: 'none' }}>
                          <div className="grow">
                            <div className="row" style={{ gap: 8 }}>
                              <b className="ltr num">#{o.number}</b>
                              <span className={ORDER_STATUS[o.status].cls}>{ORDER_STATUS[o.status].label}</span>
                            </div>
                            <div className="subtle trunc">
                              {o.customerName} · {o.itemsText}
                            </div>
                          </div>
                          <b className="num" style={{ whiteSpace: 'nowrap' }}>
                            {formatMoney(o.totalMinor)}
                          </b>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="empty">
                  <span className="ic neutral" style={{ display: 'grid', placeItems: 'center' }}>
                    <Icon name="bag" size="xl" />
                  </span>
                  <b>لا توجد طلبات بعد</b>
                  <p className="muted" style={{ fontSize: 14 }}>
                    عندما يطلب عميل عبر واتساب، يسجّل هُدهُد الطلب هنا.
                  </p>
                  <Link className="btn btn-soft btn-sm" href="/dashboard/catalog">
                    أضف منتجاتك
                  </Link>
                </div>
              )}
            </section>
          )}
        </div>

        <div className="col" style={{ gap: 20 }}>
          {sections.bookings !== false && (
            <section className="card" aria-labelledby="bk-h" data-clarity-mask="true">
              <div className="card-head">
                <h2 id="bk-h">الحجوزات القادمة</h2>
                <Link href="/dashboard/bookings" style={{ fontSize: 14 }}>
                  التقويم
                </Link>
              </div>
              {data.upcoming.length > 0 ? (
                <ul>
                  {data.upcoming.map((b) => {
                    const [time, ampm] = clock(minutesOf(new Date(b.startsAt))).split(' ');
                    return (
                      <li key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #E6E9F0' }}>
                        <div style={{ width: 56, flex: 'none', textAlign: 'center' }}>
                          <b className="num" style={{ display: 'block', fontSize: 16 }}>
                            {time}
                          </b>
                          <span className="subtle">{ampm}</span>
                        </div>
                        <div className="grow">
                          <b style={{ display: 'block' }}>{b.customerName}</b>
                          <span className="subtle">
                            {b.serviceName}
                            {b.memberName ? ` · ${b.memberName}` : ''}
                          </span>
                        </div>
                        <span className={BOOKING_STATUS[b.status].cls}>{BOOKING_STATUS[b.status].label}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="empty" style={{ padding: '28px 20px' }}>
                  <b>لا توجد حجوزات قادمة</b>
                  <p className="muted" style={{ fontSize: 14 }}>
                    حدّد أوقات عملك ليبدأ هُدهُد باستقبال الحجوزات.
                  </p>
                  <Link className="btn btn-soft btn-sm" href="/dashboard/bookings">
                    إعداد المواعيد
                  </Link>
                </div>
              )}
            </section>
          )}

          <section className="card" aria-labelledby="act-h">
            <div className="card-head">
              <h2 id="act-h">نشاط هُدهُد اليوم</h2>
            </div>
            {hasActivity ? (
              <ul>
                {activity.map((c) => (
                  <li key={c.label} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '11px 20px', borderTop: '1px solid #E6E9F0' }}>
                    <span className={c.ic} style={{ ...ICON_BOX }}>
                      <Icon name={c.icon} size="sm" />
                    </span>
                    <span className="grow">{c.label}</span>
                    <b className="num" style={{ fontSize: 17 }}>
                      {c.value}
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty" style={{ padding: '28px 20px' }}>
                <b>لا يوجد نشاط بعد</b>
                <p className="muted" style={{ fontSize: 14 }}>
                  بعد ربط واتساب، ستظهر هنا أرقام نشاط هُدهُد اليومي.
                </p>
              </div>
            )}
            <div className="row" style={{ gap: 8, padding: '12px 20px', borderTop: '1px solid #E6E9F0', color: '#4A5468', fontSize: 13 }}>
              <Icon name="lock" size="sm" />
              <span>حمايةً لخصوصية عملائك، لا يحفظ هُدهُد محتوى المحادثات، وتظهر هنا الأرقام فقط.</span>
            </div>
          </section>
        </div>
      </div>

      <Dialog
        open={confirmPause}
        onClose={() => setConfirmPause(false)}
        labelledBy="pz-h"
        describedBy="pz-d"
        role="alertdialog"
        body={
          <>
            <span className="ic warn" style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center' }}>
              <Icon name="pause" size="lg" />
            </span>
            <h2 id="pz-h">إيقاف هُدهُد مؤقتاً؟</h2>
            <p id="pz-d" className="muted">
              لن يرد هُدهُد على أي رسالة جديدة حتى تعيد تشغيله، وسينتظر العملاء ردّك أنت.
            </p>
          </>
        }
        foot={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmPause(false)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => call('/api/app/ai/pause', { duration: 'manual' }, 'تم إيقاف هُدهُد مؤقتاً')}>
              إيقاف مؤقت
            </button>
          </>
        }
      />
    </main>
  );
}
