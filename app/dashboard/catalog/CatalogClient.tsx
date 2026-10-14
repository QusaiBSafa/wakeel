'use client';

import Link from 'next/link';
import { useState } from 'react';
import ItemDrawer from '@/components/catalog/ItemDrawer';
import ProductCard, { stockOf } from '@/components/catalog/ProductCard';
import ServiceRow from '@/components/catalog/ServiceRow';
import Dialog from '@/components/ui/Dialog';
import EmptyState from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import Tabs from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import type { CatalogData } from '@/lib/server/loaders/catalog';
import type { CatalogItemDTO } from '@/lib/types';

type Kind = 'product' | 'service';

export default function CatalogClient({ data, initialTab }: { data: CatalogData; initialTab: Kind }) {
  const toast = useToast();
  const [src, setSrc] = useState(data);
  const [items, setItems] = useState<CatalogItemDTO[]>(data.items);
  if (src !== data) {
    setSrc(data);
    setItems(data.items);
  }
  const showProducts = data.sections.products !== false;
  const showServices = data.sections.services !== false;
  const allowed: Kind[] = [...(showProducts || !showServices ? (['product'] as Kind[]) : []), ...(showServices ? (['service'] as Kind[]) : [])];
  const [tab, setTab] = useState<Kind>(allowed.includes(initialTab) ? initialTab : allowed[0]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<{ item: CatalogItemDTO | null } | null>(null);
  const [del, setDel] = useState<CatalogItemDTO | null>(null);

  const mine = items.filter((x) => x.kind === tab);
  const term = q.trim();
  const filt = (x: CatalogItemDTO) => {
    if (filter === 'off') return !x.active;
    if (filter === 'on') return x.active;
    if (filter === 'in') return x.active && stockOf(x) > 5;
    if (filter === 'low') return stockOf(x) > 0 && stockOf(x) <= 5;
    if (filter === 'out') return stockOf(x) === 0;
    return true;
  };
  const list = mine.filter((x) => filt(x) && (!term || x.name.includes(term) || x.description.includes(term)));
  const filters = tab === 'product' ? [['all', 'الكل'], ['in', 'متوفر'], ['low', 'كمية قليلة'], ['out', 'نفد'], ['off', 'مخفي']] : [['all', 'الكل'], ['on', 'ظاهرة'], ['off', 'مخفية']];

  async function toggle(x: CatalogItemDTO) {
    try {
      const saved = await api<CatalogItemDTO>('PATCH', `/api/app/catalog/${x.id}`, { active: !x.active });
      setItems((all) => all.map((y) => (y.id === x.id ? saved : y)));
      toast(x.active ? `أُخفي «${x.name}» عن العملاء` : `أصبح «${x.name}» ظاهراً للعملاء`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  async function remove() {
    const x = del;
    if (!x) return;
    const index = items.findIndex((y) => y.id === x.id);
    try {
      await api('DELETE', `/api/app/catalog/${x.id}`);
      setItems((all) => all.filter((y) => y.id !== x.id));
      setDel(null);
      setEdit(null);
      toast(`تم حذف «${x.name}»`, {
        undo: async () => {
          try {
            const back = await api<CatalogItemDTO>('POST', `/api/app/catalog/${x.id}/restore`);
            setItems((all) => {
              const arr = all.slice();
              arr.splice(Math.min(index, arr.length), 0, back);
              return arr;
            });
          } catch (e) {
            toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
          }
        },
      });
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    }
  }

  const svc = tab === 'service';
  return (
    <main className="page" id="main">
      <div className="page-head">
        <div className="t">
          <h1>المنتجات والخدمات</h1>
          <p>يجيب هُدهُد العملاء عن الأسعار والتوفّر من هذه القائمة، ويسجّل منها الطلبات والحجوزات.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ item: null })}>
          <Icon name="plus" />
          {svc ? 'أضف خدمة' : 'أضف منتج'}
        </button>
      </div>

      <Tabs
        label="النوع"
        value={tab}
        onChange={(k) => {
          setTab(k);
          setFilter('all');
          setQ('');
        }}
        tabs={allowed.map((k) => ({ value: k, label: k === 'product' ? 'المنتجات' : 'الخدمات', count: items.filter((x) => x.kind === k).length }))}
      />

      <div className="toolbar">
        <div className="search" style={{ flex: '1 1 240px' }}>
          <Icon name="search" />
          <label htmlFor="c-q" className="sr-only">
            ابحث
          </label>
          <input id="c-q" className="input" type="search" placeholder={svc ? 'ابحث في الخدمات' : 'ابحث في المنتجات'} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }} role="group" aria-label="فلترة">
          {filters.map(([k, label]) => (
            <button key={k} type="button" className={filter === k ? 'chip on' : 'chip'} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mine.length === 0 && (
        <EmptyState
          icon={svc ? 'calendar' : 'bag'}
          title={svc ? 'لم تُضف خدمات بعد' : 'لم تُضف منتجات بعد'}
          text={svc ? 'أضف خدماتك ومدتها ليحجز هُدهُد المواعيد المتاحة للعملاء.' : 'أضف منتجاتك مع أسعارها ليجيب هُدهُد العملاء ويسجّل طلباتهم.'}
        >
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEdit({ item: null })}>
              {svc ? 'أضف أول خدمة' : 'أضف أول منتج'}
            </button>
            <Link className="btn btn-ghost btn-sm" href="/dashboard/account?tab=sections">
              {svc ? 'لا تقدّم خدمات؟ أخفِ هذا القسم' : 'لا تبيع منتجات؟ أخفِ هذا القسم'}
            </Link>
          </div>
        </EmptyState>
      )}
      {mine.length > 0 && list.length === 0 && (
        <div className="card empty">
          <b>لا توجد نتائج</b>
          <p className="muted" style={{ fontSize: 14 }}>
            جرّب كلمة أخرى أو امسح عامل التصفية.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setQ('');
              setFilter('all');
            }}
          >
            مسح البحث
          </button>
        </div>
      )}

      {!svc && list.length > 0 && (
        <ul className="pgrid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} onToggle={() => toggle(p)} onEdit={() => setEdit({ item: p })} />
          ))}
        </ul>
      )}
      {svc && list.length > 0 && (
        <ul className="card">
          {list.map((s) => (
            <ServiceRow key={s.id} s={s} staff={data.staff} onToggle={() => toggle(s)} onEdit={() => setEdit({ item: s })} />
          ))}
        </ul>
      )}

      {edit && (
        <ItemDrawer
          key={edit.item?.id ?? 'new'}
          kind={edit.item?.kind ?? tab}
          item={edit.item}
          staff={data.staff}
          onClose={() => setEdit(null)}
          onSaved={(saved, isNew) => {
            setItems((all) => (isNew ? [saved, ...all] : all.map((y) => (y.id === saved.id ? saved : y))));
            setEdit(null);
            toast(isNew ? `تمت إضافة «${saved.name}»` : 'تم حفظ التعديلات');
          }}
          onDelete={() => setDel(edit.item)}
        />
      )}

      <Dialog
        open={!!del}
        onClose={() => setDel(null)}
        labelledBy="dl-h"
        role="alertdialog"
        body={
          <>
            <h2 id="dl-h">هل تريد حذف «{del?.name}»؟</h2>
            <p className="muted">لن يعرضه هُدهُد بعد الآن، ولن تتأثر الطلبات السابقة. لإخفائه مؤقتاً، أوقف خيار «ظاهر للعملاء» بدلاً من الحذف.</p>
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
