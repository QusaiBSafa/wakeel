'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useStore } from '@/components/app/Store';
import { Icon } from '@/components/ui/icons';
import Modal from '@/components/ui/Modal';
import { PhotoField, photoFrom, type PhotoValue } from '@/components/app/PhotoPicker';
import { CURRENCIES, type Currency } from '@/lib/constants';
import { minorToInput, parsePriceToMinor, priceLabel } from '@/lib/money';
import { api, ApiError } from '@/lib/client/api';
import type { ProductDTO } from '@/lib/types';

function Thumb({ p, small }: { p: ProductDTO; small?: boolean }) {
  if (p.imageUrl?.startsWith('blob:')) {
    // optimistic preview before the server confirms the save
    return (
      <div className={small ? 'ph sm img' : 'ph img'} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.imageUrl} alt="" />
      </div>
    );
  }
  if (p.imageUrl) {
    return (
      <div className={small ? 'ph sm img' : 'ph img'} aria-hidden="true">
        <Image src={p.imageUrl} alt="" width={small ? 96 : 256} height={small ? 96 : 256} sizes={small ? '48px' : '(max-width: 767px) 50vw, 256px'} />
      </div>
    );
  }
  return (
    <div className={small ? 'ph sm none' : 'ph none'} aria-hidden="true">
      —
    </div>
  );
}

type Form = { name: string; sku: string; price: string; currency: Currency; description: string };

function nextSku(products: ProductDTO[]) {
  let n = products.length + 1;
  const has = (s: string) => products.some((p) => p.sku.toLowerCase() === s.toLowerCase());
  while (has('PRD-' + String(n).padStart(3, '0'))) n++;
  return 'PRD-' + String(n).padStart(3, '0');
}

export default function ProductsPage() {
  const { state, setState, showToast, track } = useStore();
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [editing, setEditing] = useState<{ id: string | null; form: Form; photo: PhotoValue } | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const products = state.products;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter((p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }, [products, q]);

  const openNew = () => setEditing({ id: null, form: { name: '', sku: nextSku(products), price: '', currency: 'ILS', description: '' }, photo: photoFrom(null) });
  const openEdit = (p: ProductDTO) =>
    setEditing({ id: p.id, form: { name: p.name, sku: p.sku, price: minorToInput(p.priceMinor), currency: p.currency, description: p.description }, photo: photoFrom(p.imageUrl) });

  const save = async (form: Form, photo: PhotoValue, id: string | null) => {
    const prev = state.products;
    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      price: form.price,
      currency: form.currency,
      description: form.description.trim(),
      ...(photo.changed ? { image: photo.upload } : {}),
    };
    // optimistic: show the change now, roll back if the server says no
    const optimistic: ProductDTO = {
      id: id ?? `tmp-${Date.now()}`,
      sku: body.sku || nextSku(prev),
      name: body.name,
      priceMinor: parsePriceToMinor(form.price) ?? 0,
      currency: form.currency,
      description: body.description,
      imageUrl: photo.preview,
    };
    setState((s) => ({ ...s, products: id ? s.products.map((p) => (p.id === id ? optimistic : p)) : [optimistic, ...s.products] }));
    setEditing(null);
    try {
      const saved = await track(api<ProductDTO>(id ? 'PATCH' : 'POST', id ? `/api/app/products/${id}` : '/api/app/products', body));
      setState((s) => ({ ...s, products: s.products.map((p) => (p.id === optimistic.id ? saved : p)) }));
      showToast(id ? 'انحفظت التعديلات' : `انضاف «${saved.name}»`);
    } catch (e) {
      setState((s) => ({ ...s, products: prev }));
      const msg = e instanceof ApiError && e.status === 409 ? ` ${e.message}.` : '';
      showToast(`ما قدرنا نحفظ «${body.name}».${msg} رجّعنا التغيير.`, 'جرّب ثاني', () => setEditing({ id, form, photo }));
    }
  };

  const confirmDelete = async () => {
    const id = delId;
    setDelId(null);
    const prev = state.products;
    const idx = prev.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const item = prev[idx];
    setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
    try {
      await track(api('DELETE', `/api/app/products/${id}`));
      showToast(`انحذف «${item.name}»`, 'تراجع', async () => {
        setState((s) => {
          const ps = s.products.slice();
          ps.splice(Math.min(idx, ps.length), 0, item);
          return { ...s, products: ps };
        });
        try {
          const back = await track(api<ProductDTO>('POST', `/api/app/products/${item.id}/restore`));
          setState((s) => ({ ...s, products: s.products.map((p) => (p.id === item.id ? back : p)) }));
        } catch (e) {
          setState((s) => ({ ...s, products: s.products.filter((p) => p.id !== item.id) }));
          showToast(e instanceof ApiError ? e.message : 'ما قدرنا نرجّعه');
        }
      });
    } catch {
      setState((s) => ({ ...s, products: prev }));
      showToast(`ما قدرنا نحذف «${item.name}». رجّعناه مكانه.`);
    }
  };

  const delItem = products.find((p) => p.id === delId);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>المنتجات والخدمات</h1>
          <p className="muted">{products.length ? `${products.length} منتج · هُدهُد بجاوب عن أسعارها وتوفّرها وبجهّز الطلب للزبون` : 'المنتجات اللي بيسأل عنها زباينك'}</p>
        </div>
        {products.length > 0 && (
          <button type="button" className="btn btn-primary page-cta" onClick={openNew}>
            <Icon name="plus" />
            أضف منتج
          </button>
        )}
      </div>

      {products.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <label htmlFor="p-search" className="sr-only">
                ابحث بالاسم أو الرمز
              </label>
              <Icon name="search" style={{ position: 'absolute', right: 14, top: 14, color: '#4A5468' }} />
              <input id="p-search" className="input" type="search" placeholder="ابحث بالاسم أو الرمز" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingRight: 44 }} />
            </div>
            <div className="seg" role="group" aria-label="طريقة العرض">
              <button type="button" className={view === 'grid' ? 'on' : ''} aria-pressed={view === 'grid'} aria-label="شبكة" onClick={() => setView('grid')}>
                <Icon name="grid" />
              </button>
              <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} aria-label="قائمة" onClick={() => setView('list')}>
                <Icon name="list" />
              </button>
            </div>
          </div>

          {filtered.length === 0 && (
            <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '40px 20px' }}>
              <Icon name="search" className="i i-xl" style={{ color: '#4A5468' }} />
              <p style={{ fontWeight: 700 }}>ما لقينا إشي باسم «{q}»</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ('')}>
                امسح البحث
              </button>
            </div>
          )}

          {filtered.length > 0 && view === 'grid' && (
            <div className="pgrid">
              {filtered.map((p) => (
                <article key={p.id} className="card card-tight" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Thumb p={p} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{p.name}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#0B6E4B' }}>{priceLabel(p.priceMinor, p.currency)}</span>
                      <span className="hint" dir="ltr">
                        {p.sku}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)} aria-label={`تعديل ${p.name}`}>
                      تعديل
                    </button>
                    <button type="button" className="icon-btn sm danger" onClick={() => setDelId(p.id)} aria-label={`حذف ${p.name}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {filtered.length > 0 && view === 'list' && (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th scope="col">المنتج</th>
                    <th scope="col">الرمز</th>
                    <th scope="col">السعر</th>
                    <th scope="col">
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Thumb p={p} small />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                            <div className="hint">{p.description || 'بدون وصف'}</div>
                          </div>
                        </div>
                      </td>
                      <td dir="ltr" style={{ textAlign: 'right' }} className="muted">
                        {p.sku}
                      </td>
                      <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{priceLabel(p.priceMinor, p.currency)}</td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'left' }}>
                        <button type="button" className="icon-btn sm" onClick={() => openEdit(p)} aria-label={`تعديل ${p.name}`}>
                          <Icon name="edit" />
                        </button>{' '}
                        <button type="button" className="icon-btn sm danger" onClick={() => setDelId(p.id)} aria-label={`حذف ${p.name}`}>
                          <Icon name="trash" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 14, padding: '56px 24px' }}>
          <span style={{ width: 80, height: 80, borderRadius: 24, background: '#E4F5EE', color: '#0B6E4B', display: 'grid', placeItems: 'center' }}>
            <Icon name="products" className="i i-xl" />
          </span>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>لسّا ما في منتجات</h2>
          <p className="muted" style={{ maxWidth: 420 }}>
            أضف منتجاتك أو خدماتك مع أسعارها، وهُدهُد بجاوب الزباين عن السعر والتوفّر لحاله.
          </p>
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Icon name="plus" />
            أضف أول منتج
          </button>
        </div>
      )}

      {editing && <ProductModal key={editing.id ?? 'new'} init={editing} products={products} onClose={() => setEditing(null)} onSave={save} />}

      {delItem && (
        <Modal onClose={() => setDelId(null)} labelledBy="dm-h" describedBy="dm-d" role="alertdialog" narrow style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ width: 52, height: 52, borderRadius: 16, background: '#FEF3F2', color: '#B42318', display: 'grid', placeItems: 'center' }}>
            <Icon name="trash" className="i i-lg" />
          </span>
          <h2 id="dm-h" style={{ fontSize: 20, fontWeight: 800 }}>
            تحذف «{delItem.name}»؟
          </h2>
          <p id="dm-d" className="muted">
            هُدهُد رح يوقف يعرضه للزبائن. بتقدر تتراجع خلال ثواني بعد الحذف.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={confirmDelete}>
              احذف
            </button>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDelId(null)} data-autofocus>
              لا، خلّيه
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProductModal({
  init,
  products,
  onClose,
  onSave,
}: {
  init: { id: string | null; form: Form; photo: PhotoValue };
  products: ProductDTO[];
  onClose: () => void;
  onSave: (f: Form, photo: PhotoValue, id: string | null) => void;
}) {
  const [f, setF] = useState<Form>(init.form);
  const [photo, setPhoto] = useState<PhotoValue>(init.photo);
  const [touched, setTouched] = useState(false);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  const errors: Partial<Record<keyof Form, string>> = {};
  if (!f.name.trim()) errors.name = 'اكتب اسم المنتج';
  else if (f.name.trim().length > 80) errors.name = 'الاسم طويل، خلّيه أقل من 80 حرف';
  if (!f.price.trim()) errors.price = 'اكتب السعر';
  else if (parsePriceToMinor(f.price) === null) errors.price = 'السعر لازم يكون رقم أكبر من صفر';
  if (f.sku.trim() && !/^[\w.\-]+$/.test(f.sku.trim())) errors.sku = 'الرمز بالأحرف الإنجليزية والأرقام بس';
  else if (f.sku.trim() && products.some((p) => p.id !== init.id && p.sku.toLowerCase() === f.sku.trim().toLowerCase())) errors.sku = 'هالرمز مستخدم لمنتج ثاني';
  if (f.description.length > 500) errors.description = 'الوصف أطول من 500 حرف';
  const fe = touched ? errors : {};

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (Object.keys(errors).length) {
      setTouched(true);
      return;
    }
    onSave(f, photo, init.id);
  };

  return (
    <Modal onClose={onClose} labelledBy="pm-h">
      <form onSubmit={submit} noValidate data-clarity-mask="true">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid #E6E9F0', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <h2 id="pm-h" style={{ fontSize: 20, fontWeight: 800 }}>
            {init.id ? 'تعديل المنتج' : 'منتج جديد'}
          </h2>
          <button type="button" className="icon-btn" style={{ border: 0 }} onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <span className="lbl">
              صورة المنتج <span className="opt">(اختياري، بس بتساعد الزبون يختار)</span>
            </span>
            <PhotoField value={photo} onChange={setPhoto} fallbackInitial={(f.name || 'ص').charAt(0)} />
          </div>

          <div className="field">
            <label htmlFor="pf-name">
              الاسم <span className="req" aria-hidden="true">*</span>
            </label>
            <input
              id="pf-name"
              data-autofocus
              className={fe.name ? 'input bad' : 'input'}
              value={f.name}
              onChange={set('name')}
              placeholder="مثلاً: شامبو أرغان 250 مل"
              aria-required="true"
              aria-invalid={!!fe.name}
              aria-describedby={fe.name ? 'pf-name-e' : undefined}
              maxLength={120}
            />
            {fe.name && (
              <div id="pf-name-e" className="err">
                {fe.name}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <div className="field" style={{ flex: '2 1 160px' }}>
              <label htmlFor="pf-price">
                السعر <span className="req" aria-hidden="true">*</span>
              </label>
              <input
                id="pf-price"
                className={fe.price ? 'input bad' : 'input'}
                inputMode="decimal"
                dir="ltr"
                value={f.price}
                onChange={set('price')}
                placeholder="0.00"
                aria-required="true"
                aria-invalid={!!fe.price}
                aria-describedby={fe.price ? 'pf-price-e' : undefined}
                maxLength={12}
              />
              {fe.price && (
                <div id="pf-price-e" className="err">
                  {fe.price}
                </div>
              )}
            </div>
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label htmlFor="pf-cur">العملة</label>
              <select id="pf-cur" className="input" value={f.currency} onChange={set('currency')}>
                {CURRENCIES.map((c) => (
                  <option key={c.k} value={c.k}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="pf-sku">رمز المنتج (SKU)</label>
            <input id="pf-sku" className={fe.sku ? 'input bad' : 'input'} dir="ltr" value={f.sku} onChange={set('sku')} aria-describedby="pf-sku-h" maxLength={40} autoCapitalize="characters" />
            {fe.sku && <div className="err">{fe.sku}</div>}
            <span id="pf-sku-h" className="hint">
              عملناه لحاله، وبتقدر تغيّره.
            </span>
          </div>

          <div className="field">
            <label htmlFor="pf-desc">
              الوصف <span className="opt">(اختياري)</span>
            </label>
            <textarea id="pf-desc" className={fe.description ? 'input bad' : 'input'} value={f.description} onChange={set('description')} placeholder="الحجم، المكوّنات، المدة… أي إشي ممكن يسأل عنه الزبون" />
            <span className="hint">{f.description.length} / 500</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '16px 22px', borderTop: '1px solid #E6E9F0', position: 'sticky', bottom: 0, background: '#fff' }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
            {init.id ? 'احفظ التعديلات' : 'أضف المنتج'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
