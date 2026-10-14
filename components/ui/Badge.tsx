export type BadgeKind = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand' | 'outline' | 'accent';

export default function Badge({ kind = 'neutral', dot, children, style }: { kind?: BadgeKind; dot?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className={`bdg ${kind}`} style={style}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}
