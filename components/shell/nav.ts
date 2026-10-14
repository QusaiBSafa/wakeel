import type { IconName } from '@/components/ui/Icon';
import type { ShellData } from '@/lib/types';

export type NavKey = 'home' | 'attention' | 'orders' | 'bookings' | 'catalog' | 'business' | 'faq' | 'ai' | 'account';
export type NavItem = { k: NavKey; label: string; href: string; icon: IconName; attn?: boolean };

export const NAV: NavItem[] = [
  { k: 'home', label: 'الرئيسية', href: '/dashboard', icon: 'home' },
  { k: 'attention', label: 'تحتاج تدخلك', href: '/dashboard/attention', icon: 'alert', attn: true },
  { k: 'orders', label: 'الطلبات', href: '/dashboard/orders', icon: 'bag' },
  { k: 'bookings', label: 'الحجوزات', href: '/dashboard/bookings', icon: 'calendar' },
  { k: 'catalog', label: 'المنتجات والخدمات', href: '/dashboard/catalog', icon: 'tag' },
  { k: 'business', label: 'معلومات نشاطك', href: '/dashboard/business', icon: 'store' },
  { k: 'faq', label: 'الأسئلة الشائعة', href: '/dashboard/faq', icon: 'faq' },
];
export const SETTINGS: NavItem[] = [
  { k: 'ai', label: 'إعدادات هُدهُد', href: '/dashboard/ai', icon: 'sliders' },
  { k: 'account', label: 'إعدادات الحساب', href: '/dashboard/account', icon: 'user' },
];

/** Sections switched off in «إعدادات الحساب» disappear from the menu. */
export function visibleNav(data: ShellData): NavItem[] {
  const s = data.business.sections;
  return NAV.filter((n) => {
    if (n.k === 'orders') return s.orders !== false;
    if (n.k === 'bookings') return s.bookings !== false;
    if (n.k === 'catalog') return s.products !== false || s.services !== false;
    return true;
  });
}

export const WA_TEXT = { on: 'واتساب متصل · هُدهُد يعمل', off: 'واتساب غير متصل', warn: 'الاتصال يحتاج إلى انتباه' } as const;
export const WA_CLS = { on: 'wa-status', off: 'wa-status off', warn: 'wa-status warn' } as const;
export const WA_DOT = { on: 'pulse', off: 'dot-x', warn: 'dot-x' } as const;

export function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname === href || pathname.startsWith(href + '/');
}
