'use client';

/* eslint-disable @next/next/no-img-element -- previews are local object URLs */
import { useAuth } from '@clerk/nextjs';
import { useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { formatBytes, prepareImage } from '@/lib/client/image';
import { uploadImage, type Uploaded } from '@/lib/client/upload';

export type PhotoValue = {
  /** a local object URL for a fresh pick, or /media/… for the saved photo */
  preview: string | null;
  /** set when a new photo was uploaded in this session */
  upload: Uploaded | null;
  /** true once the owner picked or removed a photo (so the save sends `image`) */
  changed: boolean;
  info?: string;
};

export const photoFrom = (url: string | null): PhotoValue => ({ preview: url, upload: null, changed: false });

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
type Phase = 'idle' | 'busy' | 'error';

/** Product photo: drop zone, file picker, camera, busy state with size badge, change / remove. */
export default function ImageField({ value, onChange, placeholder }: { value: PhotoValue; onChange: (v: PhotoValue) => void; placeholder: React.ReactNode }) {
  const { userId } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  async function pick(file: File | undefined | null) {
    if (!file || !userId) return;
    setPhase('busy');
    try {
      const p = await prepareImage(file, 1600);
      const up = await uploadImage('products', userId, p.blob);
      onChange({ preview: URL.createObjectURL(p.blob), upload: up, changed: true, info: formatBytes(p.blob.size) });
      setPhase('idle');
    } catch {
      setPhase('error');
    }
  }

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept={ACCEPT} className="visually-hidden-file" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="visually-hidden-file" tabIndex={-1} aria-hidden="true" onChange={(e) => pick(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
    </>
  );

  return (
    <div className="field">
      <span className="lbl">
        صورة المنتج <span className="opt">(تساعد العميل على معرفة ما يطلبه)</span>
      </span>
      {phase === 'busy' ? (
        <div className="drop" aria-live="polite">
          <span className="spin dk" />
          <b style={{ fontSize: 14 }}>جارٍ تجهيز الصورة…</b>
          <div className="bar" style={{ width: 180 }}>
            <span style={{ width: '60%' }} />
          </div>
        </div>
      ) : phase === 'error' ? (
        <div className="drop bad" role="alert">
          {inputs}
          <div className="err">
            <Icon name="alert" size="sm" />
            هذا الملف ليس صورة مدعومة أو حجمه أكبر من 10 ميغابايت
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
            اختر صورة أخرى
          </button>
        </div>
      ) : value.preview ? (
        <div className="row" style={{ gap: 12 }}>
          {inputs}
          <div className="thumb" style={{ width: 120, background: '#EEF0F3' }} role="img" aria-label="معاينة الصورة">
            <img src={value.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="bdg success" style={{ alignSelf: 'flex-start' }}>
              جاهزة{value.info ? ` · ${value.info}` : ''}
            </span>
            <div className="row" style={{ gap: 4 }}>
              <button type="button" className="btn-link" onClick={() => fileRef.current?.click()}>
                تغيير
              </button>
              <button type="button" className="btn-link" style={{ color: '#B42318' }} onClick={() => onChange({ preview: null, upload: null, changed: true })}>
                إزالة
              </button>
            </div>
          </div>
        </div>
      ) : (
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
          {placeholder}
          <b style={{ fontSize: 14 }}>اسحب الصورة إلى هنا</b>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
              اختر صورة
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => camRef.current?.click()}>
              صوّر بالكاميرا
            </button>
          </div>
          <span className="hint">JPG أو PNG أو WebP، حتى 10 ميغابايت. نصغّرها تلقائياً.</span>
        </div>
      )}
    </div>
  );
}
