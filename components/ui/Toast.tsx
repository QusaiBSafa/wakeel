'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';

type ToastOpts = { kind?: 'ok' | 'bad'; undo?: () => void };
type ToastState = { id: number; text: string; kind: 'ok' | 'bad'; undo?: () => void };
type Fn = (text: string, opts?: ToastOpts) => void;

const Ctx = createContext<Fn>(() => {});

export const useToast = () => useContext(Ctx);

/** One toast at a time; the next one replaces the current. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);

  const toast = useCallback<Fn>((text, opts = {}) => {
    clearTimeout(timer.current);
    setT({ id: ++seq.current, text, kind: opts.kind || 'ok', undo: opts.undo });
    timer.current = setTimeout(() => setT(null), opts.undo ? 4000 : 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {t && (
        <div key={t.id} className={`toast ${t.kind}`} role="status" aria-live="polite">
          <Icon name={t.kind === 'bad' ? 'info' : 'check'} />
          {t.text}
          {t.undo && (
            <button
              type="button"
              onClick={() => {
                const u = t.undo;
                clearTimeout(timer.current);
                setT(null);
                u?.();
              }}
            >
              تراجع
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
