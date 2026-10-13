'use client';

import { useStore } from './Store';

export default function ToastView() {
  const { toast, hideToast } = useStore();
  return (
    <div aria-live="polite" role="status">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                const a = toast.action!;
                hideToast();
                a();
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
