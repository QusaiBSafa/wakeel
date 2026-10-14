'use client';

export default function RadioCard({
  name,
  checked,
  onChange,
  title,
  desc,
  disabled,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: React.ReactNode;
  desc?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={checked ? 'radio-card on' : 'radio-card'}>
      <input type="radio" name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span>
        <b>{title}</b>
        {desc && <span className="muted" style={{ fontSize: 13.5 }}>{desc}</span>}
      </span>
    </label>
  );
}
