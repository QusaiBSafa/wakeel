'use client';

export default function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
  style,
}: {
  value: T;
  options: { value: T; label: React.ReactNode; aria?: string }[];
  onChange: (v: T) => void;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className="seg" role="group" aria-label={label} style={style}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className={o.value === value ? 'on' : undefined} aria-pressed={o.value === value} aria-label={o.aria} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
