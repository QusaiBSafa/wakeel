export default function Switch({
  on,
  onToggle,
  label,
  labelledBy,
}: {
  on: boolean;
  onToggle: () => void;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <button
      type="button"
      className={on ? 'switch on' : 'switch'}
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-labelledby={labelledBy}
      onClick={onToggle}
    />
  );
}
