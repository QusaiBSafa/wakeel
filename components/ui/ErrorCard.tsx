'use client';

import EmptyState from './EmptyState';
import { Icon } from './Icon';

export default function ErrorCard({ title = 'تعذّر تحميل الصفحة', text = 'حدثت مشكلة في الاتصال.', onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  return (
    <EmptyState icon="alert" tone="danger" title={title} text={text} role="alert">
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <Icon name="retry" />
          أعد المحاولة
        </button>
      )}
    </EmptyState>
  );
}
