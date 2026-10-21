import 'server-only';

/** Hudhud is effectively on when switched on, or when a timed pause has run out. */
export function aiEffective(row: { enabled: boolean; pausedUntil: Date | null } | undefined, now = Date.now()): boolean {
  if (!row) return false;
  return row.enabled || (row.pausedUntil !== null && row.pausedUntil.getTime() <= now);
}
