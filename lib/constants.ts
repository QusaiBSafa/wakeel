// Shared copy and lookup tables (client + server). Arabic copy is Modern Standard Arabic.
// No pay-method data and no currencies other than ₪ exist in this product.

import type { AiConfig } from './types';

export type BusinessType = 'salon' | 'food' | 'clothes' | 'clinic' | 'tech' | 'other';
export type Offers = { products: boolean; services: boolean; delivery: boolean };

export const BUSINESS_TYPES: {
  k: BusinessType;
  /** onboarding card title */
  label: string;
  example: string;
  icon: string;
  offers: Offers;
  /** option label on the business page */
  selectLabel: string;
  /** «أسئلة يطرحها عادةً عملاء {plural}» */
  plural: string;
}[] = [
  { k: 'salon', label: 'صالون أو مركز تجميل', example: 'شعر، أظافر، عناية بالبشرة', icon: 'M6 3l12 12M18 3L6 15M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', offers: { products: true, services: true, delivery: false }, selectLabel: 'صالون ومركز تجميل', plural: 'صالونات التجميل' },
  { k: 'food', label: 'مطعم أو مخبز', example: 'وجبات، حلويات، طلبات خارجية', icon: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8', offers: { products: true, services: false, delivery: true }, selectLabel: 'مطعم أو مخبز', plural: 'المطاعم والمخابز' },
  { k: 'clothes', label: 'متجر ملابس', example: 'ملابس، أحذية، إكسسوارات', icon: 'M8 3l-5 4 3 4 2-1v11h8V10l2 1 3-4-5-4a4 4 0 0 1-8 0z', offers: { products: true, services: false, delivery: true }, selectLabel: 'متجر ملابس', plural: 'متاجر الملابس' },
  { k: 'clinic', label: 'عيادة', example: 'طب أسنان، علاج طبيعي، تغذية', icon: 'M12 4v16M4 12h16', offers: { products: false, services: true, delivery: false }, selectLabel: 'عيادة', plural: 'العيادات' },
  { k: 'tech', label: 'متجر إلكترونيات', example: 'هواتف، إكسسوارات، صيانة', icon: 'M7 2h10v20H7zM11 18h2', offers: { products: true, services: true, delivery: true }, selectLabel: 'متجر إلكترونيات', plural: 'متاجر الإلكترونيات' },
  { k: 'other', label: 'نشاط آخر', example: 'أي نشاط يتواصل مع عملائه عبر واتساب', icon: 'M12 5v14M5 12h14', offers: { products: true, services: false, delivery: false }, selectLabel: 'خدمات أخرى', plural: 'الأنشطة المشابهة' },
];
export const BUSINESS_TYPE_KEYS = BUSINESS_TYPES.map((t) => t.k) as [BusinessType, ...BusinessType[]];
export const typeOf = (k: string) => BUSINESS_TYPES.find((t) => t.k === k) || BUSINESS_TYPES[5];

export const CITIES = ['رام الله والبيرة', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'قلقيلية', 'أريحا', 'سلفيت', 'طوباس', 'غزة'];

/** Onboarding step 5 defaults: name, on by default, fee in ₪ (string as typed). */
export const DEFAULT_ZONES = [
  { name: 'رام الله والبيرة', on: true, fee: '15' },
  { name: 'بيتونيا', on: true, fee: '15' },
  { name: 'نابلس', on: false, fee: '25' },
  { name: 'بيت لحم', on: false, fee: '25' },
  { name: 'الخليل', on: false, fee: '30' },
  { name: 'جنين', on: false, fee: '30' },
];

export const ETA_OPTIONS = ['في اليوم نفسه', 'يوم عمل واحد', 'يوم إلى يومي عمل', '2 إلى 3 أيام عمل'] as const;

export const DURATIONS = [30, 45, 60, 90, 120, 150, 240] as const;
export const BUFFERS = [0, 10, 15, 30] as const;
export const LEAD_OPTIONS = [0, 60, 120, 1440] as const;
export const HORIZON_OPTIONS = [7, 30, 90] as const;

export const FAQ_CATEGORIES = [
  { k: 'general', label: 'عام' },
  { k: 'bookings', label: 'الحجوزات' },
  { k: 'prices', label: 'الأسعار' },
  { k: 'delivery', label: 'التوصيل' },
  { k: 'products', label: 'المنتجات' },
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]['k'];
export const FAQ_CATEGORY_KEYS = FAQ_CATEGORIES.map((c) => c.k) as [FaqCategory, ...FaqCategory[]];

// ---------- orders ----------
export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'out' | 'delivered' | 'cancelled';
export const ORDER_FLOW: OrderStatus[] = ['new', 'confirmed', 'preparing', 'out', 'delivered'];
export const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  new: { label: 'جديد', cls: 'bdg info' },
  confirmed: { label: 'تم التأكيد', cls: 'bdg brand' },
  preparing: { label: 'قيد التجهيز', cls: 'bdg accent' },
  out: { label: 'خرج للتوصيل', cls: 'bdg outline' },
  delivered: { label: 'تم التسليم', cls: 'bdg success' },
  cancelled: { label: 'ملغي', cls: 'bdg neutral' },
};
export const ORDER_STATUS_KEYS = Object.keys(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]];
/** Label of the button that moves an order out of the given status. */
export const NEXT_LABEL: Partial<Record<OrderStatus, string>> = { new: 'أكّد الطلب', confirmed: 'ابدأ التجهيز', preparing: 'أرسله للتوصيل', out: 'تم التسليم' };
/** Timeline text recorded when an order enters the given status (fixed system phrases, never customer text). */
export const NEXT_EVENT: Partial<Record<OrderStatus, string>> = {
  confirmed: 'تم تأكيد الطلب وأُرسلت رسالة إلى العميل',
  preparing: 'بدأ تجهيز الطلب',
  out: 'خرج الطلب للتوصيل وأُرسل إشعار إلى العميل',
  delivered: 'تم تسليم الطلب',
};
export const CANCEL_REASONS = [
  { k: 'customer', label: 'طلب العميل الإلغاء', text: 'طلب العميل الإلغاء.' },
  { k: 'stock', label: 'المنتج غير متوفر', text: 'المنتج غير متوفر.' },
  { k: 'area', label: 'لا نوصّل إلى هذه المنطقة', text: 'لا نوصّل إلى هذه المنطقة.' },
  { k: 'other', label: 'سبب آخر', text: 'سبب آخر.' },
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number]['k'];
export const CANCEL_REASON_KEYS = CANCEL_REASONS.map((c) => c.k) as [CancelReason, ...CancelReason[]];
/** Timeline event kinds → icon class + icon path (the prototype's TL_IC). */
export const TL_IC: Record<string, { cls: string; icon: string }> = {
  ai: { cls: 'ic brand', icon: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z' },
  wait: { cls: 'ic warn', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2' },
  cust: { cls: 'ic indigo', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
  owner: { cls: 'ic accent', icon: 'M5 12.5l4.5 4.5L19 7' },
  done: { cls: 'ic brand', icon: 'M5 12.5l4.5 4.5L19 7' },
  cancel: { cls: 'ic danger', icon: 'M6 6l12 12M18 6L6 18' },
};
export const EVENT_KINDS = Object.keys(TL_IC);

// ---------- bookings ----------
export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled';
export const BOOKING_STATUS: Record<BookingStatus, { label: string; cls: string }> = {
  confirmed: { label: 'مؤكد', cls: 'bdg success' },
  pending: { label: 'بانتظار التأكيد', cls: 'bdg warning' },
  done: { label: 'مكتمل', cls: 'bdg neutral' },
  cancelled: { label: 'ملغي', cls: 'bdg danger' },
};

// ---------- team ----------
export type TeamRole = 'owner' | 'admin' | 'staff' | 'book';

// ---------- plan (static this round) ----------
export const PLAN = { name: 'الباقة الأساسية', priceMinor: 14900, conversations: 1000, members: 5, items: 100 } as const;

// ---------- AI settings ----------
export const AI_DEFAULTS: AiConfig = {
  mode: 'auto',
  lang: 'match',
  tone: 'friendly',
  name: 'هُدهُد',
  emoji: true,
  perms: { orders: true, bookings: true, resched: true, prices: true, alt: true, discount: false },
  rules: { human: true, complaint: true, unknown: true, discount: true, big: false, group: true },
  bigMinor: 50000,
  groupNum: 3,
  notify: { dash: true, wa: true, email: false },
  unk: 'handoff',
  unkMsg: 'شكراً لسؤالك! سيرد عليك أحد أفراد فريقنا خلال ساعات العمل.',
};

// ---------- FAQ suggestions by business type (key = `${type}.${index}`) ----------
export const FAQ_SUGGESTIONS: Record<BusinessType, string[]> = {
  salon: [
    'هل تستقبلون العملاء بدون موعد مسبق؟',
    'هل منتجاتكم مناسبة للبشرة الحساسة؟',
    'كم تستغرق جلسة الكيراتين؟',
    'هل يوجد موقف للسيارات قريب منكم؟',
    'هل يمكنني إلغاء الموعد أو تأجيله؟',
  ],
  food: ['هل يوجد توصيل؟ وإلى أين؟', 'كم يستغرق تجهيز الطلب؟', 'هل توجد أطباق نباتية أو خالية من الغلوتين؟', 'هل تستقبلون حجوزات للطاولات؟', 'هل يوجد حد أدنى للطلب؟'],
  clothes: ['ما سياسة الإرجاع والاستبدال؟', 'كيف أعرف المقاس المناسب؟', 'هل يوجد توصيل؟ وكم رسومه؟', 'كم تستغرق مدة التوصيل؟', 'هل تتوفر مقاسات كبيرة؟'],
  clinic: ['كم سعر الكشفية؟', 'هل تقبلون التأمين الصحي؟ وأي شركات؟', 'كيف ألغي موعدي أو أؤجله؟', 'كم دقيقة يجب أن أصل قبل الموعد؟', 'هل تستقبلون الحالات الطارئة؟'],
  tech: ['هل الأجهزة أصلية وعليها كفالة؟', 'كم مدة الكفالة؟', 'هل تقدّمون خدمة صيانة؟ وكم تستغرق؟', 'هل يوجد توصيل؟', 'هل تقبلون استبدال الأجهزة القديمة؟'],
  other: ['ما الخدمات التي تقدّمونها؟', 'كم الأسعار تقريباً؟', 'كيف يمكنني الطلب أو الحجز؟', 'ما سياسة الإلغاء؟', 'أين يقع مكانكم؟'],
};

export function faqSuggestionsFor(type: string) {
  const t = (BUSINESS_TYPES.find((x) => x.k === type)?.k || 'other') as BusinessType;
  return FAQ_SUGGESTIONS[t].map((q, i) => ({ key: `${t}.${i}`, q }));
}

export const MAX_TEAM_MEMBERS = 5;
