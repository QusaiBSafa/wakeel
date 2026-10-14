'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Drawer from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client/api';
import { DAYS } from '@/lib/format';
import { minorToInput, parsePriceToMinor } from '@/lib/money';
import type { CatalogItemDTO, MemberDTO } from '@/lib/types';
import ImageField, { photoFrom, type PhotoValue } from './ImageField';

type Form = {
  name: string;
  desc: string;
  price: string;
  dur: string;
  staff: string[];
  days: number[];
  variants: { name: string; price: string }[];
  stockMode: 'always' | 'qty' | 'out';
  qty: string;
  active: boolean;
};

function formOf(kind: 'product' | 'service', item: CatalogItemDTO | null, staff: MemberDTO[]): Form {
  if (item)
    return {
      name: item.name,
      desc: item.description,
      price: minorToInput(item.priceMinor),
      dur: String(item.durationMin ?? 45),
      staff: item.staffIds,
      days: item.days,
      variants: item.variants.map((v) => ({ name: v.name, price: minorToInput(v.priceMinor) })),
      stockMode: item.stockMode,
      qty: String(item.stockQty ?? 10),
      active: item.active,
    };
  return { name: '', desc: '', price: '', dur: '45', staff: staff[0] ? [staff[0].id] : [], days: [0, 1, 2, 3, 4, 5], variants: [], stockMode: 'always', qty: '10', active: true };
}

/** Add / edit drawer for a product or a service. Calls the API itself and hands back the saved item. */
export default function ItemDrawer({
  kind,
  item,
  staff,
  onClose,
  onSaved,
  onDelete,
}: {
  kind: 'product' | 'service';
  item: CatalogItemDTO | null;
  staff: MemberDTO[];
  onClose: () => void;
  onSaved: (saved: CatalogItemDTO, isNew: boolean) => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const isNew = !item;
  const [f, setF] = useState<Form>(() => formOf(kind, item, staff));
  const [photo, setPhoto] = useState<PhotoValue>(() => photoFrom(item?.imageUrl ?? null));
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const svc = kind === 'service';

  const priceOk = parsePriceToMinor(f.price) !== null;
  const nameErr = touched && !f.name.trim();
  const priceErr = touched && !priceOk;
  const staffErr = touched && svc && f.staff.length === 0;

  async function save() {
    if (!f.name.trim() || !priceOk || (svc && f.staff.length === 0)) {
      setTouched(true);
      return;
    }
    const body: Record<string, unknown> = { name: f.name, description: f.desc, price: f.price, active: f.active };
    if (isNew) body.kind = kind;
    if (svc) {
      body.durationMin = Number(f.dur);
      body.staffIds = f.staff;
      body.days = f.days;
    } else {
      body.variants = f.variants.filter((v) => v.name.trim()).map((v) => ({ name: v.name, price: v.price }));
      body.stockMode = f.stockMode;
      if (f.stockMode === 'qty') body.stockQty = Math.max(0, parseInt(f.qty, 10) || 0);
      if (photo.changed) body.image = photo.upload ? { url: photo.upload.url, pathname: photo.upload.pathname } : null;
    }
    setSaving(true);
    try {
      const saved = isNew ? await api<CatalogItemDTO>('POST', '/api/app/catalog', body) : await api<CatalogItemDTO>('PATCH', `/api/app/catalog/${item.id}`, body);
      onSaved(saved, isNew);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'حدث خطأ، أعد المحاولة', { kind: 'bad' });
    } finally {
      setSaving(false);
    }
  }

  const stockCards: ['always' | 'qty' | 'out', string, string][] = [
    ['always', 'متوفر دائماً', 'دون تتبّع الكمية'],
    ['qty', 'بكمية محددة', 'يخبر هُدهُد العملاء بنفاد الكمية عند انتهائها'],
    ['out', 'نفد حالياً', 'يعتذر هُدهُد ويعرض بدائل'],
  ];

  return (
    <Drawer
      open
      onClose={onClose}
      labelledBy="ed-h"
      head={
        <>
          <h2 id="ed-h" className="grow" style={{ fontSize: 19 }}>
            {isNew ? (svc ? 'خدمة جديدة' : 'منتج جديد') : `تعديل ${item.name}`}
          </h2>
          <button type="button" className="ib" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </>
      }
      foot={
        <>
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving} style={{ flex: '1 1 auto' }}>
            {saving && <span className="spin" />}
            {isNew ? 'أضف' : 'احفظ التعديلات'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          {!isNew && (
            <button type="button" className="btn btn-danger-soft" onClick={onDelete}>
              احذف
            </button>
          )}
        </>
      }
    >
      {!svc && <ImageField value={photo} onChange={setPhoto} placeholder={<Icon name="upload" size="lg" style={{ color: '#5F687B' }} />} />}

      <div className="field">
        <label htmlFor="f-name">
          الاسم <span className="req" aria-hidden="true">*</span>
        </label>
        <input id="f-name" className={nameErr ? 'input bad' : 'input'} value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={svc ? 'مثلاً: قص وسشوار' : 'مثلاً: شامبو أرغان'} aria-required="true" />
        {nameErr && <span className="err">اكتب الاسم</span>}
      </div>
      <div className="field">
        <label htmlFor="f-desc">
          الوصف <span className="opt">(اختياري)</span>
        </label>
        <textarea id="f-desc" className="input" value={f.desc} onChange={(e) => set({ desc: e.target.value })} placeholder="الحجم، المكونات، لمن يناسب… أي معلومة قد يسأل عنها العميل" />
      </div>
      <div className="grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="f-price">
            السعر (₪) <span className="req" aria-hidden="true">*</span>
          </label>
          <input id="f-price" className={priceErr ? 'input ltr bad' : 'input ltr'} inputMode="decimal" dir="ltr" value={f.price} onChange={(e) => set({ price: e.target.value })} placeholder="0" aria-required="true" />
          {priceErr && <span className="err">يجب أن يكون السعر رقماً أكبر من صفر</span>}
        </div>
        {svc && (
          <div className="field">
            <label htmlFor="f-dur">المدة</label>
            <select id="f-dur" className="input" value={f.dur} onChange={(e) => set({ dur: e.target.value })}>
              <option value="30">30 د</option>
              <option value="45">45 د</option>
              <option value="60">ساعة</option>
              <option value="90">ساعة ونصف</option>
              <option value="120">ساعتان</option>
              <option value="150">ساعتان ونصف</option>
              <option value="240">4 ساعات</option>
            </select>
          </div>
        )}
      </div>

      {!svc && (
        <>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>
              الأحجام أو الأنواع <span className="opt">(اختياري)</span>
            </legend>
            <ul className="col" style={{ gap: 8 }}>
              {f.variants.map((v, i) => (
                <li key={i} className="row" style={{ gap: 8 }}>
                  <label className="sr-only" htmlFor={`vn${i}`}>اسم النوع</label>
                  <input id={`vn${i}`} className="input" value={v.name} onChange={(e) => set({ variants: f.variants.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="مثلاً: 500 مل" />
                  <label className="sr-only" htmlFor={`vp${i}`}>سعره</label>
                  <input id={`vp${i}`} className="input" inputMode="decimal" dir="ltr" value={v.price} onChange={(e) => set({ variants: f.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} placeholder="₪" style={{ maxWidth: 100 }} />
                  <button type="button" className="ib sm danger" onClick={() => set({ variants: f.variants.filter((_, j) => j !== i) })} aria-label="إزالة النوع">
                    <Icon name="close" size="sm" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-link" onClick={() => set({ variants: [...f.variants, { name: '', price: '' }] })} style={{ alignSelf: 'flex-start' }}>
              + أضف حجم أو نوع
            </button>
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>
              التوفّر
            </legend>
            <div className="col" style={{ gap: 8 }}>
              {stockCards.map(([k, title, desc]) => (
                <div key={k} className="col" style={{ gap: 8 }}>
                  <label className={f.stockMode === k ? 'radio-card on' : 'radio-card'}>
                    <input type="radio" name="stk" checked={f.stockMode === k} onChange={() => set({ stockMode: k })} />
                    <span className="grow">
                      <b>{title}</b>
                      <span className="subtle">{desc}</span>
                    </span>
                  </label>
                  {k === 'qty' && f.stockMode === 'qty' && (
                    <div className="field" style={{ paddingInlineStart: 30 }}>
                      <label htmlFor="f-qty">الكمية الموجودة</label>
                      <input id="f-qty" className="input" inputMode="numeric" dir="ltr" value={f.qty} onChange={(e) => set({ qty: e.target.value.replace(/\D/g, '') })} style={{ maxWidth: 140 }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </fieldset>
        </>
      )}

      {svc && (
        <>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>
              من يقدّم الخدمة
            </legend>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {staff.map((m) => {
                const on = f.staff.includes(m.id);
                return (
                  <label key={m.id} className={on ? 'check on' : 'check'}>
                    <input type="checkbox" checked={on} onChange={() => set({ staff: on ? f.staff.filter((x) => x !== m.id) : [...f.staff, m.id] })} />
                    <Avatar name={m.name} color={m.color} size="sm" />
                    {m.name}
                  </label>
                );
              })}
            </div>
            {staffErr && <span className="err">اختر موظفاً واحداً على الأقل</span>}
          </fieldset>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>
              الأيام المتاحة
            </legend>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {DAYS.map((d, i) => {
                const on = f.days.includes(i);
                return (
                  <button key={d} type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => set({ days: on ? f.days.filter((x) => x !== i) : [...f.days, i].sort() })}>
                    {d}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      )}

      <div className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid #E6E9F0', borderRadius: 12 }}>
        <span>
          <b style={{ display: 'block' }}>ظاهر للعملاء</b>
          <span className="subtle">عند إيقافه، لن يعرضه هُدهُد ولن يقبل طلبات عليه</span>
        </span>
        <button type="button" className={f.active ? 'sw on' : 'sw'} role="switch" aria-checked={f.active} aria-label="ظاهر للعملاء" onClick={() => set({ active: !f.active })} />
      </div>
    </Drawer>
  );
}
