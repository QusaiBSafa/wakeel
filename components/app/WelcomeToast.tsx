'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from './Store';

/** Shows the post-onboarding toast once, then cleans ?welcome from the URL. */
export default function WelcomeToast() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useStore();
  const welcome = params.get('welcome');
  useEffect(() => {
    if (!welcome) return;
    showToast(welcome === 'skip' ? 'بتقدر تكمّل الإعداد من «خطوات التجهيز» بأي وقت' : 'أهلاً فيك! هاي لوحة التحكم تبعتك');
    router.replace(pathname, { scroll: false });
  }, [welcome, showToast, router, pathname]);
  return null;
}
