import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Arabic, Tajawal } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { arSA } from '@clerk/localizations';
import Clarity from '@/components/Clarity';
import { clerkAppearance } from '@/components/clerk-appearance';
import './styles/hodhod.css';
import './styles/app.css';

const plex = IBM_Plex_Sans_Arabic({ weight: ['400', '500', '600', '700'], subsets: ['arabic'], display: 'swap', variable: '--font-plex' });
const tajawal = Tajawal({ weight: ['500', '700', '800'], subsets: ['arabic'], display: 'swap', variable: '--font-tajawal' });

export const metadata: Metadata = {
  title: 'هُدهُد: لوحة التحكم',
  description: 'جهّز هُدهُد ليرد على عملائك عبر واتساب',
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
      <html lang="ar" dir="rtl" className={`${plex.variable} ${tajawal.variable}`}>
        <body className="hd">
          {children}
          <Clarity />
        </body>
      </html>
    </ClerkProvider>
  );
}
