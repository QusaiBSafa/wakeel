'use client';

import { createContext, useContext } from 'react';
import type { ShellData } from '@/lib/types';

const Ctx = createContext<ShellData | null>(null);

export const ShellProvider = Ctx.Provider;

/** Shell data (business, counts, WhatsApp state) for any client component inside the dashboard layout. */
export function useShell(): ShellData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShell outside the dashboard shell');
  return v;
}
