'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { CANCEL_REASONS, type CancelReason } from '@/lib/constants';

export default function CancelDialog({ number, onClose, onConfirm }: { number: number; onClose: () => void; onConfirm: (r: CancelReason) => void }) {
  const [reason, setReason] = useState<CancelReason>('customer');
  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="cx-h"
      role="alertdialog"
      body={
        <>
          <h2 id="cx-h">هل تريد إلغاء الطلب #{number}؟</h2>
          <p className="muted">سنرسل إلى العميل رسالة بإلغاء الطلب، ولا يمكن التراجع عن ذلك.</p>
          <div className="field">
            <label htmlFor="cx-r">سبب الإلغاء</label>
            <select id="cx-r" className="input" value={reason} onChange={(e) => setReason(e.target.value as CancelReason)}>
              {CANCEL_REASONS.map((r) => (
                <option key={r.k} value={r.k}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </>
      }
      foot={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            لا، تراجع
          </button>
          <button type="button" className="btn btn-danger" onClick={() => onConfirm(reason)}>
            ألغِ الطلب
          </button>
        </>
      }
    />
  );
}
