// Shared copy and lookup tables (client + server). Arabic copy follows the approved prototype.

export const DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'] as const;

export const CATEGORIES = [
  { k: 'clinic', label: 'عيادة', plural: 'العيادات' },
  { k: 'salon', label: 'صالون أو حلاق', plural: 'الصالونات' },
  { k: 'restaurant', label: 'مطعم أو مطبخ', plural: 'المطاعم' },
  { k: 'shop', label: 'متجر', plural: 'المتاجر' },
  { k: 'other', label: 'غير ذلك', plural: 'الشركات' },
] as const;
export type Category = (typeof CATEGORIES)[number]['k'];
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.k) as [Category, ...Category[]];

export const CURRENCIES = [
  { k: 'ILS', label: 'شيكل ₪', symbol: '₪' },
  { k: 'JOD', label: 'دينار أردني', symbol: 'د.أ' },
  { k: 'USD', label: 'دولار $', symbol: '$' },
  { k: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
  { k: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
  { k: 'EGP', label: 'جنيه مصري', symbol: 'ج.م' },
] as const;
export type Currency = (typeof CURRENCIES)[number]['k'];
export const CURRENCY_KEYS = CURRENCIES.map((c) => c.k) as [Currency, ...Currency[]];

export const PAYMENT_METHODS = [
  { k: 'cash', label: 'كاش' },
  { k: 'card', label: 'بطاقة ائتمان' },
  { k: 'transfer', label: 'تحويل بنكي' },
  { k: 'wallet', label: 'محفظة إلكترونية' },
  { k: 'cod', label: 'الدفع عند الاستلام' },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['k'];
export const PAYMENT_KEYS = PAYMENT_METHODS.map((p) => p.k) as [PaymentMethod, ...PaymentMethod[]];

export const HOURS_TEMPLATE_KEY = 'common.hours';

/** FAQ templates seeded into a business's FAQ list, by category (prototype FAQ_COMMON / FAQ_BY). */
export const FAQ_COMMON: { key: string; q: string }[] = [
  { key: 'common.location', q: 'وين مكانكم بالضبط؟' },
  { key: HOURS_TEMPLATE_KEY, q: 'شو أوقات الدوام؟' },
  { key: 'common.payment', q: 'شو طرق الدفع المتاحة؟' },
  { key: 'common.parking', q: 'في موقف سيارات قريب؟' },
];

const BY: Record<Category, string[]> = {
  clinic: ['قديش سعر الكشفية؟', 'بتستقبلوا تأمين صحي؟ أي شركات؟', 'كيف بلغي أو بأجّل موعدي؟', 'لازم أوصل قبل الموعد بقديش؟', 'في استقبال حالات طارئة؟'],
  salon: ['قديش سعر قص الشعر؟', 'لازم أحجز مسبقاً ولا بتستقبلوا بدون موعد؟', 'شو سياسة إلغاء الموعد؟', 'في باقات عرايس أو مناسبات؟', 'بتبيعوا المنتجات اللي بتستعملوها؟'],
  restaurant: ['في توصيل؟ لوين وقديش رسومه؟', 'قديش بياخد الطلب ليوصل؟', 'في أكل نباتي أو خالي من الغلوتين؟', 'بتاخدوا حجز طاولات؟', 'في حد أدنى للطلب؟'],
  shop: ['في توصيل؟ لوين وقديش رسومه؟', 'شو سياسة الإرجاع والتبديل؟', 'كيف بعرف المقاس المناسب؟', 'في دفع عند الاستلام؟', 'قديش بتاخد مدة التوصيل؟'],
  other: ['شو الخدمات اللي بتقدموها؟', 'قديش الأسعار تقريباً؟', 'كيف بقدر أحجز أو أطلب؟', 'شو سياسة الإلغاء؟'],
};

export const FAQ_BY: Record<Category, { key: string; q: string }[]> = Object.fromEntries(
  Object.entries(BY).map(([cat, qs]) => [cat, qs.map((q, i) => ({ key: `${cat}.${i + 1}`, q }))]),
) as Record<Category, { key: string; q: string }[]>;

export function faqTemplatesFor(cat: Category) {
  return [...FAQ_COMMON, ...FAQ_BY[cat]];
}

export const SLOT_OPTIONS = [
  ['15', '15 د'],
  ['30', '30 د'],
  ['45', '45 د'],
  ['60', 'ساعة'],
  ['custom', 'مخصّص'],
] as const;

export const BUFFER_OPTIONS = [
  [0, 'بدون فاصل'],
  [5, '5 دقائق'],
  [10, '10 دقائق'],
  [15, '15 دقيقة'],
  [30, '30 دقيقة'],
] as const;

export const MAX_RANGES_PER_DAY = 4;
