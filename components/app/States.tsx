'use client';

import { Icon } from '@/components/ui/icons';

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="card" role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12, padding: '48px 24px', width: '100%' }}>
      <span style={{ width: 64, height: 64, borderRadius: 18, background: '#FEF3F2', color: '#B42318', display: 'grid', placeItems: 'center' }}>
        <Icon name="alert" className="i i-xl" />
      </span>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>ما قدرنا نحمّل معلوماتك</h2>
      <p className="muted" style={{ maxWidth: 420 }}>
        صار خلل بالاتصال. معلوماتك محفوظة وما ضاع إشي، جرّب كمان مرة.
      </p>
      <button type="button" className="btn btn-primary" onClick={onRetry}>
        <Icon name="retry" />
        جرّب كمان مرة
      </button>
    </div>
  );
}

export function PageSkeleton({ products }: { products?: boolean }) {
  return (
    <div aria-busy="true" aria-label="جاري التحميل" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skel" style={{ height: 34, width: 240, maxWidth: '100%' }} />
      {products ? (
        <>
          <div className="skel" style={{ height: 48 }} />
          <div className="pgrid">
            {[1, 2, 3, 4, 5, 6].map((x) => (
              <div key={x} className="card card-tight" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="skel" style={{ aspectRatio: '1 / 1' }} />
                <div className="skel" style={{ height: 16, width: '70%' }} />
                <div className="skel" style={{ height: 14, width: '40%' }} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="skel" style={{ height: 140, borderRadius: 20 }} />
          <div className="two">
            <div className="skel" style={{ height: 220, borderRadius: 20 }} />
            <div className="skel" style={{ height: 220, borderRadius: 20 }} />
          </div>
        </>
      )}
    </div>
  );
}
