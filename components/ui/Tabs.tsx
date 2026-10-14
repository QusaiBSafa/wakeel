'use client';

import Count from './Count';

export default function Tabs<T extends string>({
  value,
  tabs,
  onChange,
  label,
  className = 'tabs',
}: {
  value: T;
  tabs: { value: T; label: React.ReactNode; count?: number; countCls?: string; dot?: boolean }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={className} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} className={t.value === value ? 'tab on' : 'tab'} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count !== undefined && <Count n={t.count} cls={t.countCls} small />}
          {t.dot && <span className="dot-x" style={{ color: 'var(--warning)' }} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
}
