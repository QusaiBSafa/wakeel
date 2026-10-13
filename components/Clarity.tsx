'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || 'yw1mpfxfq9';
// preview deployments (the staging branch) are tagged "staging"; local runs "development"
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ? 'production' : process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview' ? 'staging' : 'development';

/**
 * Microsoft Clarity, same project as the landing page so both land in one place.
 * Only the Clerk user id is sent (no email, phone or business data); form areas are masked with data-clarity-mask.
 */
export default function Clarity() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!CLARITY_ID) return;
    const c = window.clarity;
    if (!c) return;
    c('set', 'environment', ENVIRONMENT);
    if (isLoaded && userId) c('identify', userId);
  }, [isLoaded, userId]);

  if (!CLARITY_ID) return null;
  return (
    <Script id="clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});window.clarity("set","environment",${JSON.stringify(ENVIRONMENT)});`}
    </Script>
  );
}
