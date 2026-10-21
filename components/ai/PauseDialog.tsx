'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';

export type PauseChoice = '1h' | 'tmr' | 'manual';
const OPTS: [PauseChoice, string][] = [
  ['1h', 'ساعة واحدة'],
  ['tmr', 'حتى صباح الغد (9:00 ص)'],
  ['manual', 'حتى أعيد تشغيله بنفسي'],
];

export default function PauseDialog({ busy, onClose, onConfirm }: { busy: boolean; onClose: () => void; onConfirm: (c: PauseChoice) => void }) {
  const [pick, setPick] = useState<PauseChoice>('tmr');
  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="pz-h"
      role="alertdialog"
      body={
        <div className="col" style={{ gap: 12 }}>
          <h2 id="pz-h">إيقاف الردود التلقائية؟</h2>
          <p className="muted">لن يرد هُدهُد على الرسائل الجديدة، وسيتعين عليك الرد على العملاء بنفسك من تطبيق واتساب. لا تتأثر الطلبات والحجوزات الحالية.</p>
          <fieldset className="col" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>
              مدة الإيقاف
            </legend>
            {OPTS.map(([k, label]) => (
              <label key={k} className={pick === k ? 'radio-card on' : 'radio-card'} style={{ padding: '10px 14px' }}>
                <input type="radio" name="pz" checked={pick === k} onChange={() => setPick(k)} />
                <span>
                  <b>{label}</b>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      }
      foot={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            لا، أبقِه يعمل
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={() => onConfirm(pick)}>
            أوقف الردود
          </button>
        </>
      }
    />
  );
}
