import { useSyncExternalStore } from 'react';

const noop = () => () => {};

/** false during server rendering and hydration, true afterwards (portals need `document`). */
export function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}
