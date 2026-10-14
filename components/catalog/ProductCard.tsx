/* eslint-disable @next/next/no-img-element -- photos come from our own /media proxy */
import { Icon } from '@/components/ui/Icon';
import { colorOf } from '@/lib/color';
import { formatMoney } from '@/lib/format';
import type { CatalogItemDTO } from '@/lib/types';

export function stockOf(x: CatalogItemDTO): number {
  return x.stockMode === 'always' ? 99 : x.stockMode === 'out' ? 0 : x.stockQty ?? 0;
}

export function stockBadge(x: CatalogItemDTO): { text: string; cls: string } {
  const n = stockOf(x);
  if (x.stockMode === 'always') return { text: 'متوفر', cls: 'bdg success' };
  if (n === 0) return { text: 'نفد', cls: 'bdg danger' };
  if (n <= 5) return { text: `كمية قليلة · ${n}`, cls: 'bdg warning' };
  return { text: `متوفر · ${n}`, cls: 'bdg success' };
}

export function Thumb({ item, style }: { item: Pick<CatalogItemDTO, 'id' | 'imageUrl' | 'name'>; style?: React.CSSProperties }) {
  return (
    <div className={`thumb t${colorOf(item.id) % 7}`} style={style} role="img" aria-label={`صورة ${item.name}`}>
      {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="bag" />}
    </div>
  );
}

export default function ProductCard({ p, onToggle, onEdit }: { p: CatalogItemDTO; onToggle: () => void; onEdit: () => void }) {
  const st = stockBadge(p);
  return (
    <li className={p.active ? 'card pcard' : 'card pcard off'}>
      <div style={{ position: 'relative' }}>
        <Thumb item={p} />
        {!p.active && (
          <span className="bdg neutral" style={{ position: 'absolute', top: 8, right: 8 }}>
            مخفي عن العملاء
          </span>
        )}
      </div>
      <div className="col" style={{ gap: 4 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: 15.5, lineHeight: 1.4 }}>{p.name}</h3>
          <b className="num" style={{ whiteSpace: 'nowrap', color: '#0A6A4A' }}>
            {formatMoney(p.priceMinor)}
          </b>
        </div>
        {p.variants.length > 0 && (
          <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
            {p.variants.map((v) => (
              <span key={v.name} className="bdg outline" style={{ fontSize: 11.5 }}>
                {v.name} · {formatMoney(v.priceMinor)}
              </span>
            ))}
          </div>
        )}
        <span className={st.cls} style={{ alignSelf: 'flex-start' }}>
          {st.text}
        </span>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 'auto', paddingTop: 4, borderTop: '1px solid #E6E9F0' }}>
        <label className="row" style={{ gap: 8, fontSize: 13, color: '#4A5468', minHeight: 40 }}>
          <button type="button" className={p.active ? 'sw on' : 'sw'} role="switch" aria-checked={p.active} aria-label={`ظهور ${p.name} للعملاء`} onClick={onToggle} />
          <span className="hide-m">{p.active ? 'ظاهر' : 'مخفي'}</span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`تعديل ${p.name}`}>
          <Icon name="edit" size="sm" />
          تعديل
        </button>
      </div>
    </li>
  );
}
