'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import Logo from '@/components/ui/Logo';
import { Icon, WhatsAppLogo, type IconName } from '@/components/ui/icons';
import { useStore } from './Store';
import ToastView from './ToastView';
import WaModal from './WaModal';
import WelcomeToast from './WelcomeToast';
import { Suspense } from 'react';
import { readiness } from '@/lib/readiness';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: 'home' },
  { href: '/dashboard/products', label: 'المنتجات', icon: 'products' },
  { href: '/dashboard/booking', label: 'المواعيد', icon: 'booking' },
  { href: '/dashboard/info', label: 'معلومات عامة', icon: 'info' },
  { href: '/dashboard/faq', label: 'الأسئلة الشائعة', icon: 'faq' },
];

const AUTOSAVE_PAGES = ['/dashboard/booking', '/dashboard/info', '/dashboard/faq'];

function SaveIndicator() {
  const { saveStatus } = useStore();
  const label = saveStatus === 'saving' ? 'عم نحفظ…' : saveStatus === 'failed' ? 'ما انحفظت آخر تغييرات، بنعيد المحاولة' : 'كل التغييرات محفوظة';
  const short = saveStatus === 'saving' ? 'عم نحفظ…' : saveStatus === 'failed' ? 'ما انحفظ' : 'محفوظ';
  return (
    <span className="hint" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: saveStatus === 'failed' ? '#B42318' : undefined }}>
      {saveStatus === 'saving' && <span className="spin dark" style={{ width: 14, height: 14 }} />}
      <span className="hide-sm">{label}</span>
      <span className="only-sm">{short}</span>
    </span>
  );
}

function VerifyBanner() {
  const { user, isLoaded } = useUser();
  if (!isLoaded || !user) return null;
  const email = user.primaryEmailAddress;
  if (!email || email.verification?.status === 'verified') return null;
  return (
    <div className="banner" role="note">
      <span>أكّد إيميلك عشان تقدر تربط واتساب لما يجهز.</span>
      <Link href="/dashboard/account" className="tap">
        أكّد الإيميل
      </Link>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state, openWa } = useStore();
  const pathname = usePathname();
  const r = readiness(state);
  const bizName = state.business.name || 'شركتك';
  const showSave = AUTOSAVE_PAGES.includes(pathname);

  return (
    <>
      <header className="top">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 22, fontWeight: 800, color: '#121A2E', minHeight: 44, textDecoration: 'none' }}>
          <Logo size={26} />
          هُدهُد
        </Link>
        <span className="tag gray hide-sm">{bizName}</span>
        <span style={{ flex: 1 }} />
        {showSave && <SaveIndicator />}
        <button type="button" className="btn btn-primary btn-sm wa-top" onClick={openWa} aria-label="اربط واتساب">
          <WhatsAppLogo />
          <span className="hide-sm">اربط واتساب</span>
        </button>
        <div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}>
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/dashboard/account"
            appearance={{ elements: { avatarBox: { width: 40, height: 40 }, userButtonTrigger: { minWidth: 44, minHeight: 44, borderRadius: 999 } } }}
          />
        </div>
      </header>
      <VerifyBanner />

      <div className="shell">
        <nav className="side" aria-label="أقسام لوحة التحكم">
          {NAV.map((n) => {
            const on = n.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={on ? 'nav-item on' : 'nav-item'} aria-current={on ? 'page' : undefined}>
                <Icon name={n.icon} />
                {n.label}
              </Link>
            );
          })}
          <div className="side-foot card card-tight" style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
              <span>جاهزية هُدهُد</span>
              <span>{r.pct}%</span>
            </div>
            <div className="bar">
              <span style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        </nav>

        <main className="main" id="main">
          {children}
        </main>
      </div>

      <WaModal />
      <ToastView />
      <Suspense fallback={null}>
        <WelcomeToast />
      </Suspense>
    </>
  );
}
