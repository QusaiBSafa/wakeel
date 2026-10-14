'use client';

import { useToast } from '@/components/ui/Toast';
import { formatMoney } from '@/lib/format';
import { fullDate } from '@/lib/format';
import type { AccountData } from '@/lib/server/loaders/account';

/** Next monthly anniversary of the signup date, strictly after `now`. */
function renewal(createdAt: string, now: Date): Date {
  const c = new Date(createdAt);
  const d = new Date(now.getFullYear(), now.getMonth(), Math.min(c.getDate(), 28));
  if (d <= now) d.setMonth(d.getMonth() + 1);
  return d;
}

export default function AccountPlan({ data }: { data: AccountData }) {
  const toast = useToast();
  const { plan, usage } = data;
  const rows: [string, number, number][] = [
    ['المحادثات هذا الشهر', usage.conversations, plan.conversations],
    ['أعضاء الفريق', usage.members, plan.members],
    ['المنتجات والخدمات', usage.items, plan.items],
  ];
  return (
    <div className="col" style={{ gap: 20 }}>
      <section className="card" aria-labelledby="pl-h">
        <div className="card-head">
          <div>
            <h2 id="pl-h">{plan.name}</h2>
            <span className="subtle">تتجدد في {fullDate(renewal(data.info.createdAt, new Date(data.now)))}</span>
          </div>
          <b className="num" style={{ fontSize: 20, color: 'var(--brand-ink, #0A6A4A)' }}>
            {formatMoney(plan.priceMinor)} <span className="subtle" style={{ fontWeight: 500 }}>شهرياً</span>
          </b>
        </div>
        <div className="card-body col" style={{ gap: 18 }}>
          {rows.map(([label, n, max]) => {
            const pct = Math.min(100, Math.round((n / max) * 100));
            return (
              <div key={label} className="col" style={{ gap: 6 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                  <span className="num subtle">
                    {n.toLocaleString('en-US')} / {max.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="bar" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${pct}%`, ...(pct >= 80 ? { background: '#B54708' } : {}) }} />
                </div>
              </div>
            );
          })}
          <div className="alert info">
            <span>يحتسب «محادثة» كل عميل تواصل معك خلال 24 ساعة، مهما كان عدد رسائله.</span>
          </div>
        </div>
        <div className="card-foot">
          <button type="button" className="btn btn-indigo btn-sm" onClick={() => toast('تفاصيل الباقات قريباً')}>
            اطّلع على الباقات
          </button>
        </div>
      </section>
    </div>
  );
}
