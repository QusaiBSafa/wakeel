'use client';

import { createPortal } from 'react-dom';
import { useFocusTrap } from './useFocusTrap';

/** Side drawer: `.scrim` + `aside.drawer-r` with head / body / foot slots. */
export default function Drawer({
  open,
  onClose,
  labelledBy,
  head,
  children,
  foot,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  head: React.ReactNode;
  children: React.ReactNode;
  foot?: React.ReactNode;
}) {
  const ref = useFocusTrap<HTMLElement>(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="hd" style={{ minHeight: 0, background: 'transparent' }}>
      <div className="scrim" onClick={onClose} />
      <aside ref={ref} className="drawer-r" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="drawer-head">{head}</div>
        <div className="drawer-body">{children}</div>
        {foot && <div className="drawer-foot">{foot}</div>}
      </aside>
    </div>,
    document.body,
  );
}
