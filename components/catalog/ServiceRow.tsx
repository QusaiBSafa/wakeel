import Avatar from '@/components/ui/Avatar';
import { DAYS, durText, formatMoney } from '@/lib/format';
import type { CatalogItemDTO, MemberDTO } from '@/lib/types';

export default function ServiceRow({ s, staff, onToggle, onEdit }: { s: CatalogItemDTO; staff: MemberDTO[]; onToggle: () => void; onEdit: () => void }) {
  const who = staff.filter((m) => s.staffIds.includes(m.id));
  return (
    <li style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #E6E9F0' }}>
      <div className="grow" style={{ flex: '1 1 240px' }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <h3>{s.name}</h3>
          {!s.active && <span className="bdg neutral">مخفية</span>}
        </div>
        <p className="subtle" style={{ fontSize: 13.5 }}>
          {s.description || 'بدون وصف'}
        </p>
      </div>
      <div className="row" style={{ gap: 18, flexWrap: 'wrap' }}>
        <span className="col" style={{ gap: 0 }}>
          <span className="subtle">المدة</span>
          <b>{durText(s.durationMin ?? 60)}</b>
        </span>
        <span className="col" style={{ gap: 0 }}>
          <span className="subtle">السعر</span>
          <b className="num">{formatMoney(s.priceMinor)}</b>
        </span>
        <span className="col" style={{ gap: 0 }}>
          <span className="subtle">من</span>
          <span className="row" style={{ gap: 4 }}>
            {who.map((m) => (
              <span key={m.id} title={m.name}>
                <Avatar name={m.name} color={m.color} size="sm" />
              </span>
            ))}
          </span>
        </span>
        <span className="col" style={{ gap: 0 }}>
          <span className="subtle">متاحة</span>
          <b style={{ fontWeight: 600 }}>{s.days.length >= 6 ? 'كل أيام الدوام' : s.days.map((d) => DAYS[d]).join('، ')}</b>
        </span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button type="button" className={s.active ? 'sw on' : 'sw'} role="switch" aria-checked={s.active} aria-label={`ظهور ${s.name} للعملاء`} onClick={onToggle} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`تعديل ${s.name}`}>
          تعديل
        </button>
      </div>
    </li>
  );
}
