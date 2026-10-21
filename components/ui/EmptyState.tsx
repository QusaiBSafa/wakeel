import { Icon, type IconName } from './Icon';

export default function EmptyState({
  icon = 'check',
  tone = 'brand',
  title,
  text,
  children,
  role,
}: {
  icon?: IconName;
  tone?: 'brand' | 'neutral' | 'danger' | 'warn' | 'indigo' | 'accent';
  title: string;
  text?: React.ReactNode;
  children?: React.ReactNode;
  role?: 'alert';
}) {
  return (
    <div className="card empty" role={role}>
      <span className={`ic ${tone}`} style={{ display: 'grid', placeItems: 'center' }}>
        <Icon name={icon} size="xl" />
      </span>
      <h2>{title}</h2>
      {text && <p className="muted">{text}</p>}
      {children}
    </div>
  );
}
