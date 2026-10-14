export default function Count({ n, cls = '', small, label }: { n: number | string; cls?: string; small?: boolean; label?: string }) {
  return (
    <span className={`count ${cls}`.trim()} aria-label={label} style={small ? { height: 20, minWidth: 20, fontSize: 11.5 } : undefined}>
      {n}
    </span>
  );
}
