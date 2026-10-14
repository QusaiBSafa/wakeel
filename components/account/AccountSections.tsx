'use client';

import { useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import Sw from '@/components/ui/Sw';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import type { AccountData } from '@/lib/server/loaders/account';
import type { Sections } from '@/lib/types';

const SECTIONS: [keyof Sections, string, string, IconName, string][] = [
  ['orders', 'الطلبات', 'استقبال طلبات شراء المنتجات وتوصيلها', 'bag', 'أُخفيت صفحة الطلبات. إذا طلب عميل شراء منتج، يخبره هُدهُد بأن الشراء يتم في المحل.'],
  ['bookings', 'الحجوزات', 'حجز المواعيد حسب أوقات العمل وفريق العمل', 'calendar', 'أُخفيت صفحة الحجوزات. لن يحجز هُدهُد مواعيد، وسيحوّل طلبات الحجز إليك.'],
  ['products', 'المنتجات', 'عرض المنتجات وأسعارها وتوفّرها', 'tag', 'لن يتحدث هُدهُد عن المنتجات أو أسعارها.'],
  ['services', 'الخدمات', 'عرض الخدمات ومددها وأسعارها', 'sparkle', 'لن يتحدث هُدهُد عن الخدمات أو أسعارها.'],
  ['delivery', 'التوصيل', 'مناطق التوصيل ورسومه', 'truck', 'سيخبر هُدهُد العملاء بأن الاستلام من المحل فقط.'],
];

export default function AccountSections({ data, onChanged }: { data: AccountData; onChanged: () => void }) {
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [sec, setSec] = useState<Sections>(data.info.sections);
  if (src !== data) {
    setSrc(data);
    setSec(data.info.sections);
  }

  async function toggle(k: keyof Sections, title: string, on: boolean) {
    const prev = sec;
    const next = { ...sec, [k]: on };
    setSec(next);
    try {
      await api('PATCH', '/api/app/account', { sections: next });
      toast(on ? `ظهر قسم ${title}` : `أُخفي قسم ${title}`);
      onChanged();
    } catch (e) {
      setSec(prev);
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  return (
    <section className="card" aria-labelledby="sc-h">
      <div className="card-head">
        <div>
          <h2 id="sc-h">الأقسام الظاهرة</h2>
          <span className="subtle">أخفِ ما لا يناسب نشاطك. لن يتحدث هُدهُد عن قسم مخفي.</span>
        </div>
      </div>
      <ul>
        {SECTIONS.map(([k, title, desc, icon, offText]) => (
          <li key={k} style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
              <span className="row" style={{ gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
                <span className="ic neutral" style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, flex: 'none' }}>
                  <Icon name={icon} />
                </span>
                <span className="col" style={{ gap: 2 }}>
                  <b>{title}</b>
                  <span className="subtle">{desc}</span>
                </span>
              </span>
              <Sw on={sec[k]} label={`إظهار قسم ${title}`} onChange={(v) => toggle(k, title, v)} />
            </div>
            {!sec[k] && (
              <div className="alert info" style={{ marginTop: 10, fontSize: 13, padding: '8px 12px' }}>
                {offText}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
