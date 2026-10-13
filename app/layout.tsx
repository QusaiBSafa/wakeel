import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { arSA } from '@clerk/localizations';
import Clarity from '@/components/Clarity';
import { clerkAppearance } from '@/components/clerk-appearance';
import './globals.css';

export const metadata: Metadata = {
  title: 'هُدهُد: لوحة التحكم',
  description: 'جهّز هُدهُد ليرد على زباينك على واتساب',
  robots: { index: false, follow: false },
  icons: { icon: '/favicon-32.png', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F8F4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={arSA}
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/"
    >
      <html lang="ar" dir="rtl">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />
        </head>
        <body className="hh">
          {children}
          <Clarity />
        </body>
      </html>
    </ClerkProvider>
  );
}
