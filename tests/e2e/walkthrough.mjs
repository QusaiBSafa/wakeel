// End-to-end walkthrough + responsive audit.
// Local:   HUDHUD_E2E_AUTH=1 DATABASE_URL=… npx next dev -p 3100   then   node tests/e2e/walkthrough.mjs
// It signs up (mock auth locally), runs onboarding, exercises every page, screenshots each screen at
// 360/390/768/1280px and reports horizontal overflow and tap targets smaller than 44px.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.env.SHOTS_DIR || 'screenshots';
const WIDTHS = [360, 390, 768, 1280];
const USER = process.env.E2E_USER || `user_e2e${Date.now().toString(36)}`;
const OTHER = USER + 'b';
fs.mkdirSync(OUT, { recursive: true });

const problems = [];
const log = (...a) => console.log(...a);
const host = new URL(BASE).hostname;

async function audit(page, name, width) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const small = [];
    const sel = 'button, a[href], input:not([type=hidden]):not(.visually-hidden-file), select, textarea, [role=switch], [role=tab], [role=radio]';
    for (const el of document.querySelectorAll(sel)) {
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || el.closest('[hidden]')) continue;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      // inline links inside running text are exempt (WCAG 2.5.8 inline exception)
      if (el.tagName === 'A' && s.display === 'inline' && el.closest('p')) continue;
      // switches carry an invisible ::before extending the hit area on touch layouts
      if (el.getAttribute('role') === 'switch' && window.innerWidth < 1024) continue;
      // checkboxes/radios sit inside a 44px label (.check) that is the real target
      if (el.tagName === 'INPUT' && el.closest('label.check')) continue;
      // desktop layout (≥1024, mouse) keeps the prototype's 36px compact buttons
      if (window.innerWidth >= 1024 && !matchMedia('(pointer:coarse)').matches && b.height >= 24 && b.width >= 24) continue;
      if (b.height < 43.5 || b.width < 43.5) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
    }
    // text clipped horizontally inside its own box
    const clipped = [];
    for (const el of document.querySelectorAll('h1,h2,h3,button,.tag,label:not(.sr-only),.chip')) {
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') clipped.push((el.textContent || '').trim().slice(0, 30));
    }
    return { overflow, small: [...new Set(small)], clipped };
  });
  const tag = `${name}@${width}`;
  if (r.overflow > 0) problems.push(`${tag}: horizontal overflow ${r.overflow}px`);
  if (r.small.length) problems.push(`${tag}: small targets → ${r.small.join(' | ')}`);
  if (r.clipped.length) problems.push(`${tag}: clipped → ${r.clipped.join(' | ')}`);
}

async function shoot(page, name) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
    await page.waitForTimeout(250);
    await audit(page, name, w);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

async function context(browser, userId) {
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1280, height: 900 } });
  if (process.env.HUDHUD_MOCK !== '0') await ctx.addCookies([{ name: 'e2e_user', value: userId, domain: host, path: '/' }]);
  return ctx;
}

const browser = await chromium.launch();
try {
  // ---------- landing + auth ----------
  const anon = await browser.newContext({ locale: 'ar' });
  const lp = await anon.newPage();
  await lp.goto(BASE + '/');
  await shoot(lp, '00-landing');
  await lp.goto(BASE + '/sign-up');
  await shoot(lp, '01-sign-up');
  await lp.goto(BASE + '/sign-in');
  await shoot(lp, '02-sign-in');
  await anon.close();

  const ctx = await context(browser, USER);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

  // ---------- onboarding ----------
  await page.goto(BASE + '/onboarding');
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByText('اكتب اسم الشركة عشان نكمّل').waitFor();
  await shoot(page, '10-onboarding-1-error');
  await page.getByLabel('اسم الشركة').fill('صالون لمسة');
  await page.getByRole('radio', { name: 'صالون أو حلاق' }).click();
  await page.getByLabel('رقم التواصل').fill('0599 123 456');
  await shoot(page, '11-onboarding-1');
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByRole('heading', { name: 'أضف أول منتج أو خدمة' }).waitFor();
  await page.getByLabel('الاسم').fill('قص وسشوار');
  await page.getByLabel('السعر (₪)').fill('70');
  await page.getByRole('button', { name: 'أضف للقائمة' }).click();
  await page.getByText('منتجاتك (1)').waitFor();
  await shoot(page, '12-onboarding-2');
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByRole('heading', { name: 'بدك هُدهُد يحجز مواعيد؟' }).waitFor();
  await shoot(page, '13-onboarding-3');
  await page.getByRole('button', { name: 'التالي' }).click();
  await page.getByRole('heading', { name: 'آخر خطوة: اربط واتساب' }).waitFor();
  await shoot(page, '14-onboarding-4');
  await page.getByRole('button', { name: 'اربط واتساب' }).click();
  await page.getByRole('heading', { name: 'ربط واتساب قريباً' }).waitFor();
  await shoot(page, '15-wa-modal');
  await page.getByRole('button', { name: 'خبّرني لما يجهز' }).click();
  await page.getByText('تمام! رح نبعتلك إيميل').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'روح للوحة التحكم' }).click();
  await page.waitForURL('**/dashboard');
  await page.getByText('أهلاً فيك! هاي لوحة التحكم تبعتك').waitFor();

  // ---------- home ----------
  await page.getByRole('heading', { name: 'أهلاً، صالون لمسة' }).waitFor();
  await shoot(page, '20-home');

  // ---------- products ----------
  await page.goto(BASE + '/dashboard/products');
  for (const [n, p] of [
    ['شامبو أرغان 250 مل', '45'],
    ['ماسك كيراتين', '85.5'],
  ]) {
    await page.getByRole('button', { name: 'أضف منتج' }).click();
    await page.getByRole('textbox', { name: 'الاسم', exact: true }).fill(n);
    await page.getByRole('textbox', { name: 'السعر', exact: true }).fill(p);
    await page.getByRole('button', { name: 'أضف المنتج' }).click();
    await page.getByText(`انضاف «${n}»`).waitFor();
  }
  await shoot(page, '30-products-grid');
  await page.getByRole('button', { name: 'قائمة' }).click();
  await shoot(page, '31-products-list');
  await page.getByRole('button', { name: 'شبكة' }).click();
  await page.getByRole('button', { name: 'أضف منتج' }).click();
  await page.getByRole('button', { name: 'أضف المنتج' }).click();
  await page.getByText('اكتب اسم المنتج').first().waitFor();
  await shoot(page, '32-product-modal-errors');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'تعديل ماسك كيراتين' }).click();
  await page.getByLabel('الوصف').fill('علاج مكثّف بعد الصبغة.');
  await page.getByRole('button', { name: 'احفظ التعديلات' }).click();
  await page.getByText('انحفظت التعديلات').waitFor();
  await page.getByRole('button', { name: 'حذف شامبو أرغان 250 مل' }).click();
  await shoot(page, '33-delete-confirm');
  await page.getByRole('button', { name: 'احذف' }).click();
  await page.getByText('انحذف «شامبو أرغان 250 مل»').waitFor();
  await page.getByRole('button', { name: 'تراجع' }).click();
  await page.getByRole('heading', { name: 'شامبو أرغان 250 مل' }).waitFor();
  await page.getByLabel('ابحث بالاسم أو الرمز').fill('xyz');
  await page.getByText('ما لقينا إشي').waitFor();
  await shoot(page, '34-products-no-results');
  await page.getByRole('button', { name: 'امسح البحث' }).click();

  // ---------- booking ----------
  await page.goto(BASE + '/dashboard/booking');
  await page.getByRole('switch', { name: 'استقبال الحجوزات' }).first().waitFor();
  await page.getByRole('button', { name: 'أضف فترة ليوم السبت' }).click();
  await page.getByRole('button', { name: 'انسخ أوقات السبت لكل الأيام المفتوحة' }).click();
  await page.getByRole('radio', { name: '45 د' }).click();
  await page.getByLabel('فاصل بين المواعيد').selectOption('15');
  await page.getByLabel('التاريخ').fill('2026-12-25');
  await page.getByLabel('ملاحظة').fill('عيد الميلاد');
  await page.getByRole('button', { name: 'أضف', exact: true }).click();
  await page.getByText('عيد الميلاد').waitFor();
  await page.getByText('كل التغييرات محفوظة').waitFor({ timeout: 10000 });
  await shoot(page, '40-booking');
  // overlapping range error
  await page.getByLabel('بداية الفترة 2 يوم السبت').fill('12:00');
  await page.getByText('هالفترة متداخلة مع فترة ثانية').first().waitFor();
  await shoot(page, '41-booking-error');
  await page.getByLabel('بداية الفترة 2 يوم السبت').fill('16:00');

  // ---------- info ----------
  await page.goto(BASE + '/dashboard/info');
  await page.getByLabel('وصف قصير').fill('صالون نسائي للشعر والعناية.');
  await page.getByLabel('العنوان').fill('رام الله، شارع الإرسال');
  await page.getByLabel('إنستغرام').fill('@lamsa.salon');
  await page.getByLabel('كاش').check();
  await page.getByLabel('رابط الخريطة').fill('maps');
  await page.getByText('الرابط لازم يبلّش بـ https://').waitFor();
  await page.getByRole('switch', { name: 'في توصيل؟' }).click();
  await shoot(page, '50-info');
  await page.getByLabel('رابط الخريطة').fill('https://maps.google.com/x');
  await page.getByText('كل التغييرات محفوظة').waitFor({ timeout: 10000 });

  // ---------- faq ----------
  await page.goto(BASE + '/dashboard/faq');
  await page.getByRole('button', { name: 'جاوب' }).first().click();
  await page.getByLabel('جوابك').fill('رام الله، شارع الإرسال، طابق 2.');
  await page.getByRole('button', { name: 'احفظ الجواب' }).click();
  await page.getByRole('button', { name: 'ما بنطبق عليّ' }).first().click();
  await page.getByRole('button', { name: /احذف السؤال: في موقف/ }).click();
  await page.getByText('تحذف هالسؤال؟').waitFor();
  await shoot(page, '60-faq-confirm');
  await page.getByRole('button', { name: 'احذف', exact: true }).click();
  await page.getByText('انحذف السؤال').waitFor();
  await page.getByRole('button', { name: 'تراجع' }).click();
  await page.getByText('في موقف سيارات قريب؟').waitFor();
  await page.getByRole('textbox', { name: 'السؤال', exact: true }).fill('بتعملوا خصم للطلاب؟');
  await page.getByRole('button', { name: 'أضف السؤال' }).click();
  await page.getByText('انضاف السؤال').waitFor();
  await shoot(page, '61-faq');

  // ---------- reload: everything persisted ----------
  await page.goto(BASE + '/dashboard');
  await shoot(page, '21-home-filled');
  const state = await page.evaluate(async () => (await fetch('/api/app/state')).json());
  const checks = {
    products: state.products.length === 3,
    restoredProduct: state.products.some((p) => p.name === 'شامبو أرغان 250 مل'),
    slot45: state.booking.slotMinutes === 45 && state.booking.bufferMinutes === 15,
    twoRanges: state.booking.days[0].ranges.length === 2,
    closure: state.closures.some((c) => c.date === '2026-12-25'),
    info: state.business.description.includes('صالون') && state.business.mapUrl === 'https://maps.google.com/x' && state.business.paymentMethods.includes('cash'),
    faqRestored: state.faqs.some((f) => f.question === 'في موقف سيارات قريب؟'),
    customFaq: state.faqs.some((f) => f.question === 'بتعملوا خصم للطلاب؟'),
    answered: state.faqs.some((f) => f.status === 'answered'),
    notified: state.notified === true,
  };
  for (const [k, v] of Object.entries(checks)) if (!v) problems.push(`persistence check failed: ${k}`);
  log('persistence', checks);

  // ---------- data isolation ----------
  const ctxB = await context(browser, OTHER);
  const pb = await ctxB.newPage();
  await pb.goto(BASE + '/dashboard');
  await pb.waitForURL('**/onboarding');
  const iso = await pb.evaluate(async (pid) => {
    const r1 = await fetch('/api/app/state');
    const r2 = await fetch('/api/app/products/' + pid, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x', price: '1' }) });
    const r3 = await fetch('/api/app/business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'B co' }) });
    const r4 = await fetch('/api/app/products/' + pid, { method: 'DELETE' });
    const s = await (await fetch('/api/app/state')).json();
    return { noBiz: r1.status, patchOther: r2.status, create: r3.status, deleteOther: r4.status, bProducts: s.products.length, bName: s.business.name };
  }, state.products[0].id);
  log('isolation', iso);
  if (iso.noBiz !== 404 || iso.patchOther !== 404 || iso.deleteOther !== 404 || iso.bProducts !== 0 || iso.bName !== 'B co') problems.push('isolation failed: ' + JSON.stringify(iso));
  const after = await page.evaluate(async () => (await fetch('/api/app/state')).json());
  if (after.products.length !== 3 || after.business.name !== 'صالون لمسة') problems.push('user A data changed by user B');
  const anonApi = await (await browser.newContext()).request.get(BASE + '/api/app/state');
  if (anonApi.status() !== 401) problems.push('anonymous /api/app/state returned ' + anonApi.status());
} finally {
  await browser.close();
}

fs.writeFileSync(`${OUT}/problems.txt`, problems.join('\n') + '\n');
log(`\n${problems.length} problem(s)`);
for (const p of problems) log(' - ' + p);
