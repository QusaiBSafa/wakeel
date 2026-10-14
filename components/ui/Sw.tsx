'use client';

export default function Sw({ on, onChange, label, disabled, id }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; id?: string }) {
  return <button type="button" id={id} role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={on ? 'sw on' : 'sw'} onClick={() => onChange(!on)} />;
}
