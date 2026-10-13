'use client';

/* eslint-disable @next/next/no-img-element -- previews are local object URLs */
import { useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Icon } from '@/components/ui/icons';
import { prepareImage, formatBytes } from '@/lib/client/image';
import { uploadImage, type Uploaded } from '@/lib/client/upload';

export type PhotoValue = {
  /** what to show: an object URL for a fresh pick, or /media/… for the saved photo */
  preview: string | null;
  /** set when a new photo was uploaded in this session; null + changed means "removed" */
  upload: Uploaded | null;
  changed: boolean;
  info?: string;
};

export const photoFrom = (url: string | null): PhotoValue => ({ preview: url, upload: null, changed: false });

type Phase = 'idle' | 'busy' | 'error';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';

function usePick(kind: 'products' | 'logos', onDone: (v: PhotoValue) => void) {
  const { userId } = useAuth();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState('');
  const pick = async (file: File | undefined | null) => {
    if (!file || !userId) return;
    setPhase('busy');
    setProgress('');
    try {
      const p = await prepareImage(file, kind === 'logos' ? 512 : 1600);
      setProgress(`بنصغّرها من ${formatBytes(p.originalBytes)} لـ ${formatBytes(p.blob.size)} تقريباً`);
      const up = await uploadImage(kind, userId, p.blob);
      onDone({ preview: URL.createObjectURL(p.blob), upload: up, changed: true, info: `${p.width}×${p.height} · ${Math.round(p.blob.size / 1024)}KB` });
      setPhase('idle');
    } catch {
      setPhase('error');
    }
  };
  return { phase, progress, pick, reset: () => setPhase('idle') };
}

/** Product photo field (modal): drop zone, file picker, camera capture, preview, change/remove. */
export function PhotoField({ value, onChange, fallbackInitial }: { value: PhotoValue; onChange: (v: PhotoValue) => void; fallbackInitial: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const { phase, progress, pick } = usePick('products', onChange);

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept={ACCEPT} className="visually-hidden-file" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="visually-hidden-file"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))}
      />
    </>
  );

  if (phase === 'busy') {
    return (
      <div className="drop" aria-live="polite">
        <span className="spin dark" />
        <div style={{ fontWeight: 700 }}>بنجهّز الصورة…</div>
        {progress && <div className="hint">{progress}</div>}
        <div className="bar" style={{ width: 200, maxWidth: '100%' }}>
          <span style={{ width: progress ? '80%' : '35%' }} />
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="drop bad" role="alert">
        {inputs}
        <div className="err">
          <Icon name="alert" size={18} />
          هالملف مش صورة مدعومة أو حجمه أكبر من 10 ميغا
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          اختار صورة ثانية
        </button>
      </div>
    );
  }

  if (value.preview) {
    return (
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        {inputs}
        <div className="ph img" style={{ width: 110, height: 110 }} role="img" aria-label="معاينة الصورة">
          <img src={value.preview} alt="" width={110} height={110} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="tag">
            <Icon name="check" size={14} style={{ strokeWidth: 3 }} />
            {value.info ? `جاهزة · ${value.info}` : 'جاهزة'}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-text btn-sm" onClick={() => fileRef.current?.click()}>
              غيّر
            </button>
            <button type="button" className="btn btn-text btn-sm" style={{ color: '#B42318' }} onClick={() => onChange({ preview: null, upload: null, changed: true })}>
              احذف
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={drag ? 'drop drag' : 'drop'}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        pick(e.dataTransfer.files?.[0]);
      }}
    >
      {inputs}
      <Icon name="upload" className="i i-lg" style={{ color: '#4A5468' }} />
      <div style={{ fontWeight: 700 }}>اسحب الصورة لهون</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
          اختار من الجهاز
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => camRef.current?.click()}>
          <Icon name="camera" size={18} />
          صوّر بالكاميرا
        </button>
      </div>
      <div className="hint">JPG أو PNG أو WebP أو HEIC، لحد 10 ميغا. بنصغّرها لحالنا.</div>
      <span className="sr-only">{fallbackInitial}</span>
    </div>
  );
}

/** Compact picker used in onboarding step 2 ("صوّر أو اختار صورة"). */
export function PhotoTile({ value, onChange }: { value: PhotoValue; onChange: (v: PhotoValue) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { phase, pick } = usePick('products', onChange);
  const input = (
    <input ref={ref} type="file" accept="image/*" capture="environment" className="visually-hidden-file" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
  );
  if (phase === 'busy')
    return (
      <div className="drop" style={{ height: '100%', justifyContent: 'center' }} aria-live="polite">
        <span className="spin dark" />
        <span className="hint">بنصغّر الصورة…</span>
      </div>
    );
  if (phase === 'error')
    return (
      <div className="drop bad" style={{ height: '100%', justifyContent: 'center' }} role="alert">
        {input}
        <span className="err">الصورة ما انرفعت</span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current?.click()}>
          جرّب كمان مرة
        </button>
      </div>
    );
  if (value.preview)
    return (
      <div className="ph img" style={{ height: '100%', minHeight: 150, position: 'relative' }}>
        {input}
        <img src={value.preview} alt="الصورة جاهزة" />
        <button type="button" className="btn btn-ghost btn-sm" style={{ position: 'absolute', bottom: 8, insetInlineStart: 8 }} onClick={() => ref.current?.click()}>
          غيّر
        </button>
      </div>
    );
  return (
    <div className="drop" style={{ height: '100%', justifyContent: 'center' }}>
      {input}
      <Icon name="camera" className="i i-lg" style={{ color: '#4A5468' }} />
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => ref.current?.click()}>
        صوّر أو اختار صورة
      </button>
      <span className="hint">اختياري</span>
    </div>
  );
}

/** Logo picker on the معلومات عامة page. Uploads and saves right away. */
export function LogoPicker({ url, initial, onUploaded }: { url: string | null; initial: string; onUploaded: (u: Uploaded) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { phase, pick } = usePick('logos', (v) => v.upload && onUploaded(v.upload));
  const input = <input ref={ref} type="file" accept={ACCEPT} className="visually-hidden-file" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />;
  return (
    <div style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      <span className="lbl">الشعار</span>
      {input}
      {phase === 'busy' ? (
        <div className="drop" style={{ width: 96, height: 96, justifyContent: 'center' }} aria-live="polite">
          <span className="spin dark" />
          <span className="sr-only">عم نرفع الشعار</span>
        </div>
      ) : phase === 'error' ? (
        <>
          <div className="drop bad" style={{ width: 96, height: 96, padding: 6, justifyContent: 'center' }} role="alert">
            <span className="err" style={{ fontSize: 12 }}>
              ما انرفع
            </span>
          </div>
          <button type="button" className="btn btn-text btn-sm" onClick={() => ref.current?.click()}>
            جرّب ثاني
          </button>
        </>
      ) : url ? (
        <>
          <div className="ph img" style={{ width: 96, height: 96, borderRadius: 24 }} role="img" aria-label="الشعار الحالي">
            <img src={url} alt="" width={96} height={96} />
          </div>
          <button type="button" className="btn btn-text btn-sm" onClick={() => ref.current?.click()}>
            غيّر
          </button>
        </>
      ) : (
        <button type="button" className="drop" onClick={() => ref.current?.click()} style={{ width: 96, height: 96, padding: 8, cursor: 'pointer', justifyContent: 'center' }} aria-label="ارفع الشعار">
          <Icon name="upload" />
          <span className="hint">ارفع</span>
          <span className="sr-only">{initial}</span>
        </button>
      )}
    </div>
  );
}
