'use client';

import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

/** Modal dialog: `.backdrop > .dialog > .dialog-body + .dialog-foot`. Bottom sheet under 768px (CSS). */
export default function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  wide,
  body,
  foot,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  wide?: boolean;
  body: React.ReactNode;
  foot?: React.ReactNode;
}) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={wide ? 'dialog wide' : 'dialog'} role={role} aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy}>
        <div className="dialog-body">{body}</div>
        {foot && <div className="dialog-foot">{foot}</div>}
      </div>
    </div>,
    document.body,
  );
}
