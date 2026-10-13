'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, BookingDTO, BusinessDTO } from '@/lib/types';
import { api } from '@/lib/client/api';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
export type Toast = { id: number; text: string; actionLabel?: string; action?: () => void } | null;

type BusinessPatch = Partial<Omit<BusinessDTO, 'logoUrl' | 'onboarded' | 'socials' | 'delivery'>> & {
  socials?: Partial<BusinessDTO['socials']>;
  delivery?: Partial<BusinessDTO['delivery']>;
  logo?: { url: string; pathname: string } | null;
  onboarded?: true;
};

type Store = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  saveStatus: SaveStatus;
  /** Run a server write and reflect it in the saved/saving/failed indicator. */
  track: <T>(p: Promise<T>) => Promise<T>;
  toast: Toast;
  showToast: (text: string, actionLabel?: string, action?: () => void) => void;
  hideToast: () => void;
  /** Update business fields locally now and save them shortly after (debounced, retried). */
  queueBusiness: (patch: BusinessPatch) => void;
  /** Save the whole booking setup shortly after (debounced, retried). */
  queueBooking: (b: BookingDTO) => void;
  waOpen: boolean;
  openWa: () => void;
  closeWa: () => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

const DEBOUNCE = 700;
const RETRY = 4000;
const MAX_RETRIES = 5;

function mergePatch(a: BusinessPatch, b: BusinessPatch): BusinessPatch {
  return {
    ...a,
    ...b,
    ...(a.socials || b.socials ? { socials: { ...a.socials, ...b.socials } } : {}),
    ...(a.delivery || b.delivery ? { delivery: { ...a.delivery, ...b.delivery } } : {}),
  };
}

export function StoreProvider({ initial, children }: { initial: AppState; children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initial);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [toast, setToast] = useState<Toast>(null);
  const [waOpen, setWaOpen] = useState(false);
  const inflight = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const track = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    inflight.current++;
    setSaveStatus('saving');
    try {
      const r = await p;
      inflight.current--;
      if (!inflight.current) setSaveStatus('saved');
      return r;
    } catch (e) {
      inflight.current--;
      setSaveStatus('failed');
      throw e;
    }
  }, []);

  const showToast = useCallback((text: string, actionLabel?: string, action?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, actionLabel, action });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);
  const hideToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  // retries go through a ref so the flush callbacks don't reference themselves
  const retryRef = useRef<{ biz: () => void; booking: () => void }>({ biz: () => {}, booking: () => {} });

  // ---- debounced business saves ----
  const pendingBiz = useRef<BusinessPatch | null>(null);
  const bizTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bizRetries = useRef(0);

  const flushBusiness = useCallback(async () => {
    const patch = pendingBiz.current;
    if (!patch) return;
    pendingBiz.current = null;
    try {
      const r = await track(api<{ state?: AppState }>('PATCH', '/api/app/business', patch));
      bizRetries.current = 0;
      // a category change re-seeds FAQ templates on the server
      if (r.state) setState((s) => ({ ...s, faqs: r.state!.faqs }));
    } catch {
      pendingBiz.current = mergePatch(patch, pendingBiz.current || {});
      if (bizRetries.current++ < MAX_RETRIES) bizTimer.current = setTimeout(() => retryRef.current.biz(), RETRY);
    }
  }, [track]);

  const queueBusiness = useCallback(
    (patch: BusinessPatch) => {
      setState((s) => {
        const b = s.business;
        const next: BusinessDTO = {
          ...b,
          ...(patch as Partial<BusinessDTO>),
          socials: { ...b.socials, ...patch.socials },
          delivery: { ...b.delivery, ...patch.delivery },
          logoUrl: patch.logo !== undefined ? (patch.logo ? `/media/${patch.logo.pathname}` : null) : b.logoUrl,
          onboarded: patch.onboarded ? true : b.onboarded,
        };
        return { ...s, business: next };
      });
      pendingBiz.current = mergePatch(pendingBiz.current || {}, patch);
      bizRetries.current = 0;
      setSaveStatus('saving');
      clearTimeout(bizTimer.current);
      bizTimer.current = setTimeout(flushBusiness, DEBOUNCE);
    },
    [flushBusiness],
  );

  // ---- debounced booking saves ----
  const pendingBooking = useRef<BookingDTO | null>(null);
  const bookTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const bookRetries = useRef(0);

  const flushBooking = useCallback(async () => {
    const b = pendingBooking.current;
    if (!b) return;
    pendingBooking.current = null;
    try {
      await track(api('PUT', '/api/app/booking', b));
      bookRetries.current = 0;
    } catch {
      if (!pendingBooking.current) pendingBooking.current = b;
      if (bookRetries.current++ < MAX_RETRIES) bookTimer.current = setTimeout(() => retryRef.current.booking(), RETRY);
    }
  }, [track]);

  const queueBooking = useCallback(
    (b: BookingDTO) => {
      pendingBooking.current = b;
      bookRetries.current = 0;
      setSaveStatus('saving');
      clearTimeout(bookTimer.current);
      bookTimer.current = setTimeout(flushBooking, DEBOUNCE);
    },
    [flushBooking],
  );

  useEffect(() => {
    retryRef.current = { biz: flushBusiness, booking: flushBooking };
  }, [flushBusiness, flushBooking]);

  // flush pending edits when the tab is hidden/closed
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (pendingBiz.current) {
        clearTimeout(bizTimer.current);
        flushBusiness();
      }
      if (pendingBooking.current) {
        clearTimeout(bookTimer.current);
        flushBooking();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingBiz.current || pendingBooking.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [flushBusiness, flushBooking]);

  const value = useMemo<Store>(
    () => ({
      state,
      setState,
      saveStatus,
      track,
      toast,
      showToast,
      hideToast,
      queueBusiness,
      queueBooking,
      waOpen,
      openWa: () => setWaOpen(true),
      closeWa: () => setWaOpen(false),
    }),
    [state, saveStatus, track, toast, showToast, hideToast, queueBusiness, queueBooking, waOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
