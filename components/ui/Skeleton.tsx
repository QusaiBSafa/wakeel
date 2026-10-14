export default function Skeleton({ w, h = 16, r, style }: { w?: number | string; h?: number | string; r?: number | string; style?: React.CSSProperties }) {
  return <div className="sk" style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

/** Wrapper that marks a loading region for assistive tech. */
export function Busy({ children, className = 'col', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={className} style={style} aria-busy="true" aria-label="جاري التحميل">
      {children}
    </div>
  );
}
