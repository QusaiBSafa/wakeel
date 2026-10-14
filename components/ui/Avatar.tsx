import { colorOf } from '@/lib/color';

export { colorOf };

export default function Avatar({ name, color, size }: { name: string; color?: number; size?: 'sm' | 'lg' }) {
  const c = color ?? colorOf(name);
  const initial = Array.from(name.trim())[0] || '؟';
  return (
    <span className={`av${size ? ' ' + size : ''} c${c}`} aria-hidden="true">
      {initial}
    </span>
  );
}
