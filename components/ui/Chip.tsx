'use client';

export default function Chip({ on, onClick, children, small, count }: { on?: boolean; onClick?: () => void; children: React.ReactNode; small?: boolean; count?: number }) {
  return (
    <button type="button" className={`chip${small ? ' sm' : ''}${on ? ' on' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
      {count !== undefined && <span className="ct">{count}</span>}
    </button>
  );
}
