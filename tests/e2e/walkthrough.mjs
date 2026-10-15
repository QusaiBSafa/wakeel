// End-to-end walkthrough + responsive audit for the v2 dashboard (plan section 5.2).
//   HUDHUD_E2E_AUTH=1 NEXT_PUBLIC_HUDHUD_STAGING=1 DATABASE_URL=… npx next dev -p 3100   then   npm run e2e
// Mock Clerk via the `e2e_user` cookie. Screenshots at 390/768/1440 (+ an overflow-only audit at 360) go to
// screenshots/, every problem to screenshots/problems.txt. The run passes only with 0 problems.
import { chromium } from 'playwright';
import fs from 'node:fs';
import pg from 'pg';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.env.SHOTS_DIR || 'screenshots';
const WIDTHS = [390, 768, 1440];
const TAP_MIN = 40;
const stamp = Date.now().toString(36);
const USER = process.env.E2E_USER || `user_e2e${stamp}`;
const OTHER = USER + 'b';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png') || f === 'problems.txt') fs.rmSync(`${OUT}/${f}`);

const problems = [];
const log = (...a) => console.log(...a);
const host = new URL(BASE).hostname;
const problem = (m) => {
  problems.push(m);
  log('  ✗', m);
};

// ---------------------------------------------------------------- audit
async function audit(page, name, width, taps = true) {
  const r = await page.evaluate(([TAP, taps]) => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const small = [];
    const sel = 'button, a[href], input:not([type=hidden]):not(.visually-hidden-file), select, textarea, [role=switch], [role=tab], [role=radio]';
    if (taps && window.innerWidth < 1024) {
      for (const el of document.querySelectorAll(sel)) {
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || el.closest('[hidden]')) continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (el.tagName === 'A' && s.display === 'inline' && el.closest('p')) continue; // inline links in running text
        if (el.getAttribute('role') === 'switch') continue; // ::before extends the hit area
        if (el.tagName === 'INPUT' && el.closest('label')) continue; // the label is the target
        if (b.height < TAP - 0.5 || b.width < TAP - 0.5) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    return { overflow, small: [...new Set(small)] };
  }, [TAP_MIN, taps]);
  const tag = `${name}@${width}`;
  if (r.overflow > 0) problem(`${tag}: horizontal overflow ${r.overflow}px`);
  if (r.small.length) problem(`${tag}: tap targets under ${TAP_MIN}px → ${r.small.join(' | ')}`);
}

async function shoot(page, name, { taps = true } = {}) {
  await page.waitForLoadState('networkidle').catch(() => {});
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w < 768 ? 800 : 900 });
    await page.waitForTimeout(200);
    await audit(page, name, w, taps);
    await page.screenshot({ path: `${OUT}/${name}-${w}.png`, fullPage: true });
  }
  // overflow only at 360
  await page.setViewportSize({ width: 360, height: 800 });
  await page.waitForTimeout(150);
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 0) problem(`${name}@360: horizontal overflow ${o}px`);
  await page.setViewportSize({ width: 1440, height: 900 });
}

// ---------------------------------------------------------------- helpers
const click = async (loc) => {
  await loc.first().waitFor({ state: 'attached', timeout: 8000 }).catch((e) => {
    throw new Error(`not found: ${String(loc)}`);
  });
  await loc.first().evaluate((e) => {
    e.scrollIntoView({ block: 'center' });
    e.click();
  });
};
async function step(name, fn) {
  log('•', name);
  try {
    await fn();
  } catch (e) {
    problem(`${name}: ${String(e.message).split('\n').filter(Boolean).slice(0, 2).join(' ')} @${(e.stack || '').split('\n').find((l) => l.includes('walkthrough.mjs'))?.replace(/.*walkthrough.mjs:/, 'line ')}`);
  }
}
const same = (a, b) => (a === b ? true : (problem(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`), false));
const ok = (cond, msg) => cond || problem(msg);

const browser = await chromium.launch();
const ctxFor = async (userId) => {
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1440, height: 900 } });
  if (userId) await ctx.addCookies([{ name: 'e2e_user', value: userId, domain: host, path: '/' }]);
  return ctx;
};
let apiCalls = [];
function watch(page, label) {
  page.on('pageerror', (e) => problem(`${label} pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/ERR_TUNNEL_CONNECTION_FAILED|clarity/i.test(t)) return; // analytics tag blocked by the sandbox network
    if (/Failed to load resource: the server responded with a status of 4\d\d/.test(t)) return; // expected validation/conflict answers; 5xx are caught below
    problem(`${label} console: ${t.slice(0, 160)}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 500) problem(`${label} ${r.status()} ${r.request().method()} ${new URL(r.url()).pathname}`);
  });
  page.on('request', (r) => {
    if (new URL(r.url()).pathname.startsWith('/api/')) apiCalls.push(r.method() + ' ' + new URL(r.url()).pathname);
  });
}
const go = async (page, path) => {
  await page.goto(BASE + path);
  await page.waitForLoadState('networkidle').catch(() => {});
};
async function sql(q, params = []) {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query(q, params)).rows;
  } finally {
    await c.end();
  }
}
const bizId = async () => (await sql('select id from businesses where owner_user_id=$1', [USER]))[0]?.id;
const apiAs = (ctx) => ctx.request;

try {
  // 1. landing, sign-up, sign-in ------------------------------------------------------------
  const anon = await ctxFor(null);
  const lp = await anon.newPage();
  watch(lp, 'anon');
  await step('landing/auth', async () => {
    await go(lp, '/');
    await shoot(lp, '00-landing', { taps: false }); // static marketing page, out of scope for the tap audit
    await go(lp, '/sign-up');
    await shoot(lp, '01-sign-up');
    await go(lp, '/sign-in');
    await shoot(lp, '02-sign-in');
  });
  await anon.close();

  const ctx = await ctxFor(USER);
  const page = await ctx.newPage();
  watch(page, 'A');
  const body = () => page.locator('body');
  const has = async (t) => (await page.getByText(t).count()) > 0;
  const toast = async (t) =>
    page
      .getByText(t)
      .first()
      .waitFor({ timeout: 6000 })
      .catch(() => {
        throw new Error(`toast not shown: ${t}`);
      });

  // 2. onboarding ---------------------------------------------------------------------------
  await step('onboarding', async () => {
    await go(page, '/onboarding');
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.getByText('اختر نوع نشاطك للمتابعة').first().waitFor();
    await shoot(page, '10-onboarding-1-error');
    await click(page.getByText('صالون أو مركز تجميل'));
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.locator('#o-name').waitFor();
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.locator('.err').first().waitFor({ timeout: 4000 });
    await page.fill('#o-name', 'صالون لمسة');
    await page.fill('#o-phone', '+970 59 123 4567');
    await shoot(page, '11-onboarding-2');
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.getByText('متى تعمل؟').first().waitFor();
    await click(page.getByRole('button', { name: 'السبت–الخميس، 9–7' }));
    await shoot(page, '12-onboarding-3');
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.locator('#rn0').waitFor();
    await page.fill('#rn0', 'قص وسشوار');
    await page.fill('#rp0', '70');
    await shoot(page, '13-onboarding-4');
    await click(page.getByRole('button', { name: 'احفظ وأكمل لاحقاً' }));
    await page.waitForURL('**/dashboard');
    await page.getByText('لنبدأ تشغيل هُدهُد').first().waitFor();
    await shoot(page, '14-home-new-account');
    await go(page, '/onboarding');
    await page.getByRole('button', { name: /تابع: المنتجات والخدمات/ }).waitFor();
    await shoot(page, '15-onboarding-resume');
    await click(page.getByRole('button', { name: /تابع: المنتجات والخدمات/ }));
    await page.locator('#rn0').waitFor();
    await click(page.getByRole('button', { name: 'التالي' })); // 4 → 5 (not applicable for a salon)
    await page.getByText('لا تحتاج إلى هذه الخطوة').first().waitFor();
    await click(page.getByRole('button', { name: 'التالي' })); // 5 → 6
    await page.getByText('أسئلة يطرحها عملاؤك كثيراً').first().waitFor();
  });
  await step('onboarding faq + whatsapp + test + activate', async () => {
    ok((await page.locator('input[type=checkbox]:checked').count()) > 0, 'no FAQ is checked by default in step 6');
    await click(page.locator('input[type=checkbox]').last()); // uncheck one
    await click(page.locator('input[type=checkbox]').last()); // and check it again
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.getByText('اربط رقم واتساب للأعمال').first().waitFor();
    await click(page.getByRole('button', { name: 'تابع مع Meta' }));
    await page.getByText(/اختر الرقم/).first().waitFor({ timeout: 8000 });
    await click(page.getByRole('button', { name: 'أرسل رمز التحقق' }));
    await page.fill('#o-code', '000000');
    await click(page.getByRole('button', { name: 'تحقّق' }));
    await page.locator('.err').first().waitFor();
    await page.fill('#o-code', '123456');
    await click(page.getByRole('button', { name: 'تحقّق' }));
    await page.getByText('تم ربط واتساب').first().waitFor();
    await shoot(page, '16-onboarding-wa');
    await click(page.getByRole('button', { name: 'التالي' }));
    await page.locator('.chip').filter({ hasText: 'ما هي أوقات العمل؟' }).first().waitFor();
    await click(page.locator('.chip').filter({ hasText: 'ما هي أوقات العمل؟' }));
    await page.waitForTimeout(500);
    await shoot(page, '17-onboarding-test');
    await click(page.getByRole('button', { name: 'فعّل هُدهُد' }));
    await page.getByText('هُدهُد يعمل الآن!').first().waitFor({ timeout: 10000 });
    await shoot(page, '18-onboarding-live');
    await click(page.getByRole('link', { name: 'اذهب إلى لوحة التحكم' }));
    await page.waitForURL('**/dashboard');
  });

  // 3. home -----------------------------------------------------------------------------------
  await step('home banner + pause', async () => {
    await go(page, '/dashboard');
    await page.getByText('هُدهُد يعمل ويرد على عملائك').first().waitFor();
    await shoot(page, '20-home');
    await click(page.getByRole('button', { name: 'إيقاف مؤقت' }));
    await page.getByRole('alertdialog').waitFor();
    await click(page.getByRole('alertdialog').getByRole('button', { name: 'إيقاف مؤقت' }));
    await page.getByText('هُدهُد متوقف مؤقتاً.').first().waitFor({ timeout: 6000 });
    await shoot(page, '20b-home-paused');
    await click(page.getByRole('button', { name: 'أعد تشغيله' }));
    await page.getByText('هُدهُد يعمل ويرد على عملائك').first().waitFor({ timeout: 6000 });
  });

  // 4. seed demo data ---------------------------------------------------------------------------
  await step('seed demo data', async () => {
    await click(page.getByRole('button', { name: /أضف بيانات تجريبية/ }));
    await page.waitForTimeout(2500);
    await go(page, '/dashboard');
    await shoot(page, '21-home-seeded');
  });

  // 5. attention ----------------------------------------------------------------------------------
  const navCount = async (href) => {
    const t = (await page.locator(`a[href="${href}"]`).first().innerText().catch(() => '')).replace(/\D/g, '');
    return t ? Number(t) : 0;
  };
  await step('attention: reply + resolve', async () => {
    await go(page, '/dashboard/attention');
    await shoot(page, '30-attention');
    const before = await navCount('/dashboard/attention');
    ok(before >= 2, `sidebar attention count after seeding is ${before}`);
    await click(page.getByRole('button', { name: 'ردّ', exact: true }));
    await click(page.getByRole('button', { name: 'أرسل الرد' }));
    await page.getByText('اكتب الرد قبل إرساله').first().waitFor();
    const chip = page.locator('.chip.sm').filter({ hasText: /\S/ });
    if (await chip.count()) await click(chip);
    else await page.locator('textarea').first().fill('أهلاً، سنتواصل معك خلال ساعة.');
    await click(page.getByRole('button', { name: 'أرسل الرد' }));
    await toast('تم إرسال الرد');
    await shoot(page, '31-attention-replied');
    // resolve a different row (the replied one now shows «تم إرسال الرد»)
    const resolveBtns = page.getByRole('button', { name: 'تم الحل', exact: true });
    await click(resolveBtns.last());
    await page.getByRole('alertdialog').waitFor();
    await click(page.getByRole('button', { name: 'نعم، تم الحل' }));
    await toast('تم الحل وحُذفت التفاصيل');
    await page.waitForTimeout(800);
    await go(page, '/dashboard/attention');
    same(await navCount('/dashboard/attention'), before - 1);
  });

  // 6. orders -----------------------------------------------------------------------------------------
  const orderNo = async (where) => (await sql(`select number from orders where business_id=$1 and ${where} limit 1`, [await bizId()]))[0]?.number;
  const FORBID = /دفع|نقداً|بطاقة|تحويل/;
  await step('orders', async () => {
    await go(page, '/dashboard/orders');
    await click(page.getByRole('tab', { name: /^جديد/ }));
    await page.waitForTimeout(300);
    await shoot(page, '40-orders-new');
    await click(page.getByRole('tab', { name: /^الكل/ }));
    const n1 = await orderNo("customer_name='ليان سعادة'");
    await page.fill('#o-q', String(n1));
    await page.waitForTimeout(300);
    same(await page.locator('tbody tr').count(), 1);
    await page.fill('#o-q', '');
    // the draft
    const nd = await orderNo('is_draft');
    await click(page.getByRole('link', { name: `افتح الطلب ${nd}` }).or(page.getByRole('button', { name: `افتح الطلب ${nd}` })));
    await page.getByText('مسودة · بانتظار تأكيد العميل').first().waitFor();
    ok(!FORBID.test(await page.locator('[role=dialog]').first().innerText()), 'order drawer mentions a payment word');
    await shoot(page, '41-order-draft');
    await click(page.getByRole('button', { name: 'إغلاق', exact: true }));
    // new order, validation then save
    await click(page.getByRole('button', { name: 'طلب جديد' }));
    await click(page.getByRole('button', { name: 'احفظ الطلب' }));
    await page.locator('.err').first().waitFor();
    await shoot(page, '42-order-new-errors');
    await page.fill('#e-name', 'دعاء خليل');
    await page.fill('#e-phone', '+970 59 777 1234');
    await click(page.getByRole('button', { name: 'أضف', exact: true }));
    await page.selectOption('#e-area', 'pickup');
    await click(page.getByRole('button', { name: 'احفظ الطلب' }));
    await toast('تمت إضافة الطلب #');
    // advance ليان's new order, cancel سامر's
    await go(page, '/dashboard/orders');
    await click(page.getByRole('link', { name: `افتح الطلب ${n1}` }).or(page.getByRole('button', { name: `افتح الطلب ${n1}` })));
    await click(page.getByRole('button', { name: 'أكّد الطلب' }));
    await toast('حالة الطلب الآن');
    const n2 = await orderNo("customer_name='سامر حداد'");
    await go(page, `/dashboard/orders?id=${(await sql('select id from orders where business_id=$1 and number=$2', [await bizId(), n2]))[0].id}`);
    await click(page.getByRole('button', { name: 'إلغاء الطلب', exact: true }));
    await page.getByRole('alertdialog').waitFor();
    await shoot(page, '43-order-cancel');
    await click(page.getByRole('button', { name: 'ألغِ الطلب' }));
    await toast('أُلغي الطلب');
    same((await sql('select status from orders where business_id=$1 and number=$2', [await bizId(), n2]))[0].status, 'cancelled');
    same((await sql('select status from orders where business_id=$1 and number=$2', [await bizId(), n1]))[0].status, 'confirmed');
  });

  // 7. bookings -------------------------------------------------------------------------------------------
  const isoDay = (offset) => {
    const d = new Date(Date.now() + offset * 86400000);
    return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Hebron' })).toLocaleDateString('en-CA');
  };
  await step('bookings: views', async () => {
    await go(page, '/dashboard/bookings');
    await shoot(page, '50-bookings-day');
    await click(page.getByRole('button', { name: 'أسبوع', exact: true }));
    await page.waitForTimeout(400);
    await shoot(page, '51-bookings-week');
    await click(page.getByRole('button', { name: 'قائمة', exact: true }));
    await page.waitForTimeout(400);
    await shoot(page, '52-bookings-list');
  });
  await step('bookings: reschedule', async () => {
    await go(page, '/dashboard/bookings');
    await click(page.getByRole('button', { name: 'يوم', exact: true }));
    await click(page.getByRole('button', { name: /جنى خليفة/ }));
    await click(page.getByRole('button', { name: 'تغيير الموعد' }));
    await page.locator('.slots').first().waitFor();
    // find a day whose picker shows a disabled «محجوز» slot
    let seenBusy = false;
    const days = page.locator('[role=radiogroup][aria-label="اختر اليوم"] button');
    for (let i = 0; i < (await days.count()) && !seenBusy; i++) {
      await click(days.nth(i));
      await page.waitForTimeout(500);
      seenBusy = (await page.locator('.slot-btn[disabled][title="محجوز"]').count()) > 0;
    }
    ok(seenBusy, 'the slot picker never showed a disabled «محجوز» slot');
    await shoot(page, '53-bookings-reschedule');
    const free = page.locator('.slot-btn:not([disabled])');
    ok((await free.count()) > 0, 'no free slot to pick');
    await click(free.last());
    await click(page.getByRole('button', { name: 'تأكيد الموعد الجديد' }));
    await toast('تم تغيير الموعد');
  });
  await step('bookings: double POST gives one 409', async () => {
    const svc = (await sql(`select id from products where business_id=$1 and kind='service' and deleted_at is null order by created_at limit 1`, [await bizId()]))[0].id;
    let target = null;
    for (let off = 2; off < 12 && !target; off++) {
      const date = isoDay(off);
      const r = await ctx.request.get(`${BASE}/api/app/bookings/slots?itemId=${svc}&date=${date}`);
      if (!r.ok()) continue;
      const j = await r.json();
      const slot = j.slots.find((x) => !x.reason);
      if (slot) target = { date, startMin: slot.startMin };
    }
    if (!target) return problem('no free slot found in the next 10 days');
    const payload = { customer: 'مها زيد', phone: '+970 59 321 6540', itemId: svc, ...target };
    const rs = await Promise.all([ctx.request.post(`${BASE}/api/app/bookings`, { data: payload }), ctx.request.post(`${BASE}/api/app/bookings`, { data: payload })]);
    const codes = rs.map((r) => r.status()).sort();
    same(codes.join(','), '201,409');
  });
  await step('bookings: settings', async () => {
    await go(page, '/dashboard/bookings?tab=settings');
    await page.getByLabel('إغلاق يوم الخميس').fill('17:00');
    await page.getByText('لديك تغييرات غير محفوظة.').first().waitFor();
    await shoot(page, '54-bookings-settings-dirty');
    await click(page.getByRole('button', { name: 'احفظ التغييرات' }));
    await toast('تم حفظ أوقات العمل');
    // holiday
    await page.fill('#h-d', isoDay(20));
    await page.fill('#h-n', 'عطلة تجريبية');
    await click(page.getByRole('button', { name: 'إضافة يوم مغلق' }));
    await click(page.getByRole('button', { name: 'احفظ التغييرات' }));
    await toast('تم حفظ أوقات العمل');
    // leave
    await click(page.getByRole('button', { name: 'إضافة غياب' }));
    await page.fill('#lv-f', isoDay(21));
    await page.fill('#lv-t', isoDay(22));
    await click(page.getByRole('button', { name: 'حفظ', exact: true }));
    await page.getByText(/إجازة/).first().waitFor({ timeout: 6000 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    same((await sql(`select close_min from business_hours where business_id=$1 and weekday=5`, [await bizId()]))[0]?.close_min, 17 * 60);
    same((await sql(`select count(*)::int n from closures where business_id=$1`, [await bizId()]))[0].n >= 1, true);
    same((await sql(`select count(*)::int n from staff_leaves where business_id=$1`, [await bizId()]))[0].n >= 1, true);
  });

  // 8. catalog -----------------------------------------------------------------------------------------------
  await step('catalog: product + variant + low stock', async () => {
    await go(page, '/dashboard/catalog');
    await click(page.getByRole('button', { name: 'أضف منتج' }));
    await page.fill('#f-name', 'كريم يدين');
    await page.fill('#f-price', '35');
    await click(page.getByRole('button', { name: '+ أضف حجم أو نوع' }));
    await page.fill('#vn0', '100 مل');
    await page.fill('#vp0', '35');
    await click(page.getByText('بكمية محددة'));
    await page.fill('#f-qty', '3');
    await click(page.getByRole('button', { name: 'أضف', exact: true }));
    await toast('تمت إضافة «كريم يدين»');
    await page.getByText('كمية قليلة · 3').first().waitFor();
    await shoot(page, '60-catalog-low-stock');
  });
  await step('catalog: service needs staff', async () => {
    await go(page, '/dashboard/catalog?tab=services');
    await click(page.getByRole('button', { name: 'أضف خدمة' }));
    await page.fill('#f-name', 'جلسة تجريبية');
    await page.fill('#f-price', '50');
    const on = page.locator('label.check.on');
    for (let i = await on.count(); i > 0; i--) await click(on.first());
    await click(page.getByRole('button', { name: 'أضف', exact: true }));
    await page.getByText('اختر موظفاً واحداً على الأقل').first().waitFor();
    await click(page.locator('label.check').first());
    await click(page.getByRole('button', { name: 'أضف', exact: true }));
    await toast('تمت إضافة «جلسة تجريبية»');
  });
  await step('catalog: toggle visibility, delete + undo', async () => {
    await go(page, '/dashboard/catalog');
    await click(page.getByRole('switch', { name: 'ظهور كريم يدين للعملاء' }));
    await toast('أُخفي «كريم يدين» عن العملاء');
    await click(page.getByRole('button', { name: 'تعديل كريم يدين' }));
    await click(page.getByRole('button', { name: 'احذف', exact: true }));
    await page.getByRole('alertdialog').waitFor();
    await click(page.getByRole('alertdialog').getByRole('button', { name: 'احذف' }));
    await toast('تم حذف «كريم يدين»');
    await shoot(page, '61-catalog-deleted-undo');
    await click(page.getByRole('button', { name: 'تراجع' }));
    await page.getByRole('button', { name: 'تعديل كريم يدين' }).waitFor({ timeout: 6000 });
  });

  // 9. business -------------------------------------------------------------------------------------------------
  await step('business: bad map url, delivery area, rule', async () => {
    // a salon starts with the delivery section hidden; show it (the Account page toggle is exercised later)
    const r = await ctx.request.patch(`${BASE}/api/app/account`, { data: { sections: { orders: true, bookings: true, products: true, services: true, delivery: true } } });
    same(r.status(), 200);
    await go(page, '/dashboard/business');
    const loc = page.getByRole('region', { name: 'العنوان والموقع' });
    await click(loc.getByRole('button', { name: /تعديل|إضافة/ }));
    await page.fill('#f-address', 'رام الله، شارع الإرسال');
    await page.fill('#f-mapUrl', 'maps.google');
    await click(loc.getByRole('button', { name: 'حفظ', exact: true }));
    await page.getByText('يجب أن يبدأ الرابط بـ https://').first().waitFor();
    await page.fill('#f-mapUrl', 'https://maps.google.com/x');
    await click(loc.getByRole('button', { name: 'حفظ', exact: true }));
    await toast('تم حفظ «العنوان والموقع»');
    await shoot(page, '70-business');
    const dsw = page.getByRole('switch', { name: 'تفعيل التوصيل' });
    if ((await dsw.getAttribute('aria-checked')) !== 'true') {
      await click(dsw);
      await toast('تم تفعيل التوصيل');
    }
    await click(page.getByRole('button', { name: '+ إضافة منطقة' }));
    await page.locator('[id^=an]').last().fill('طولكرم');
    await click(page.getByRole('button', { name: 'حفظ مناطق التوصيل' }));
    await toast('تم حفظ مناطق التوصيل');
    await page.fill('#new-rule', 'لا نستقبل حجوزات بعد الساعة 6 مساءً');
    await click(page.getByRole('region', { name: 'قواعد أخرى' }).getByRole('button', { name: 'إضافة', exact: true }));
    await toast('تمت إضافة القاعدة');
  });

  // 10. faq ------------------------------------------------------------------------------------------------------
  await step('faq: add from suggestion, dismiss, toggle, delete + undo', async () => {
    await go(page, '/dashboard/faq');
    await shoot(page, '80-faq');
    const sug = page.getByRole('button', { name: /^أضف جواباً لسؤال/ });
    ok((await sug.count()) >= 2, 'fewer than two FAQ suggestions to add and dismiss');
    await click(sug);
    await page.fill('#e-a', 'جواب تجريبي من الفحص الشامل.');
    await click(page.getByRole('button', { name: 'أضف السؤال' }));
    await toast('تمت إضافة السؤال');
    await click(page.getByRole('button', { name: /^تجاهل سؤال/ }));
    await page.waitForTimeout(600);
    await click(page.getByRole('switch', { name: /^تفعيل سؤال/ }));
    await toast('أُوقف السؤال');
    await click(page.getByRole('button', { name: /^حذف سؤال/ }));
    await page.getByRole('alertdialog').waitFor();
    await click(page.getByRole('alertdialog').getByRole('button', { name: 'احذف' }));
    await toast('تم حذف السؤال');
    await shoot(page, '81-faq-deleted-undo');
    await click(page.getByRole('button', { name: 'تراجع' }));
    await page.waitForTimeout(800);
  });

  // 11. AI settings -----------------------------------------------------------------------------------------------
  await step('ai settings: tone persists, test chat stays client-side', async () => {
    await go(page, '/dashboard/ai');
    await click(page.getByText('رسمي', { exact: true }));
    await page.getByText('لديك تغييرات غير محفوظة.').first().waitFor();
    await click(page.getByRole('button', { name: 'احفظ التغييرات' }));
    await toast('حُفظت الإعدادات');
    await page.reload();
    await page.waitForLoadState('networkidle');
    ok((await page.locator('.chip.on').filter({ hasText: 'رسمي' }).count()) > 0, 'tone «رسمي» did not persist after reload');
    apiCalls = [];
    await click(page.locator('[aria-label="رسائل جاهزة للتجربة"] button').first());
    await page.waitForTimeout(1200);
    await click(page.locator('[aria-label="رسائل جاهزة للتجربة"] button').nth(2));
    await page.waitForTimeout(1500);
    same(apiCalls.filter((c) => !c.startsWith('GET')).length, 0);
    same(apiCalls.length, 0);
    await shoot(page, '90-ai-test-chat');
  });

  // 12. account ---------------------------------------------------------------------------------------------------------
  await step('account: whatsapp tab', async () => {
    await go(page, '/dashboard/account');
    await page.getByText('واتساب متصل').first().waitFor();
    await shoot(page, '100-account-wa');
  });
  // فريق العمل and الاشتراك are hidden for now (HIDDEN_ACCOUNT_TABS in app/dashboard/account/tabs.ts).
  await step('account: team and plan tabs are hidden', async () => {
    same(await page.getByRole('tab', { name: 'فريق العمل' }).count(), 0);
    same(await page.getByRole('tab', { name: 'الاشتراك' }).count(), 0);
    await go(page, '/dashboard/account?tab=team');
    await page.getByText('واتساب متصل').first().waitFor();
    await go(page, '/dashboard/account?tab=plan');
    await page.getByText('واتساب متصل').first().waitFor();
  });
  await step('account: sections hide/show orders', async () => {
    await click(page.getByRole('tab', { name: 'أقسام اللوحة' }));
    await click(page.getByRole('switch', { name: 'إظهار قسم الطلبات' }));
    await toast('أُخفي قسم الطلبات');
    await page.waitForTimeout(1000);
    same(await page.locator('aside a[href="/dashboard/orders"], nav a[href="/dashboard/orders"]').count(), 0);
    await shoot(page, '103-account-sections');
    await click(page.getByRole('switch', { name: 'إظهار قسم الطلبات' }));
    await toast('ظهر قسم الطلبات');
    await page.waitForTimeout(1000);
    ok((await page.locator('a[href="/dashboard/orders"]').count()) > 0, 'orders nav item did not come back');
  });
  await step('account: disconnect → home banner → reconnect (stub)', async () => {
    await go(page, '/dashboard/account');
    await click(page.getByRole('button', { name: 'افصل الرقم', exact: true }));
    await page.getByRole('alertdialog').waitFor();
    await click(page.getByRole('alertdialog').getByRole('button', { name: 'افصل الرقم' }));
    await toast('فُصل رقم واتساب');
    await go(page, '/dashboard');
    await page.getByText('أعد ربط واتساب').first().waitFor();
    await go(page, '/dashboard/account');
    await click(page.getByRole('button', { name: 'اربط رقم واتساب' }));
    await click(page.getByRole('button', { name: 'تابع مع Meta' }));
    await page.getByText(/اختر الرقم/).first().waitFor({ timeout: 8000 });
    await click(page.getByRole('button', { name: 'أرسل رمز التحقق' }));
    await page.fill('#o-code', '123456');
    await click(page.getByRole('button', { name: 'تحقّق' }));
    await page.getByText('تم ربط واتساب').first().waitFor();
    await page.waitForTimeout(800);
  });

  // 13. persistence ------------------------------------------------------------------------------------------------------
  await step('persistence after reload', async () => {
    const id = await bizId();
    const biz = (await sql('select map_url, address, rules from businesses where id=$1', [id]))[0];
    same(biz.map_url, 'https://maps.google.com/x');
    ok(JSON.stringify(biz.rules).includes('لا نستقبل حجوزات بعد الساعة 6 مساءً'), 'extra rule not stored');
    same((await sql(`select config->>'tone' tone from ai_settings where business_id=$1`, [id]))[0].tone, 'formal');
    same((await sql(`select count(*)::int n from products where business_id=$1 and name='كريم يدين' and deleted_at is null`, [id]))[0].n, 1);
    same((await sql(`select count(*)::int n from delivery_areas where business_id=$1 and name='طولكرم'`, [id]))[0].n, 1);
    await go(page, '/dashboard/business');
    ok(await has('https://maps.google.com/x'), 'business page does not show the saved map link');
    await go(page, '/dashboard/catalog');
    ok(await has('كريم يدين'), 'catalog page does not show the new product');
  });

  // 14. isolation ----------------------------------------------------------------------------------------------------------
  await step('isolation', async () => {
    const id = await bizId();
    const pick = async (q) => (await sql(q, [id]))[0]?.id;
    const ids = {
      order: await pick('select id from orders where business_id=$1 limit 1'),
      booking: await pick(`select id from bookings where business_id=$1 and status in ('pending','confirmed') limit 1`),
      item: await pick('select id from products where business_id=$1 and deleted_at is null limit 1'),
      attention: await pick('select id from attention_items where business_id=$1 limit 1'),
    };
    // user B is a real business owner with nothing in common with A
    await sql(`insert into businesses (owner_user_id, name, phone, type) values ($1, 'نشاط آخر', '+970 59 000 0001', 'other') on conflict do nothing`, [OTHER]).catch((e) => problem('could not create business B: ' + e.message));
    const ctxB = await ctxFor(OTHER);
    const pb = await ctxB.newPage();
    watch(pb, 'B');
    const cases = [
      ['order cancel', 'post', `/api/app/orders/${ids.order}/cancel`, { reason: 'customer' }],
      ['booking status', 'post', `/api/app/bookings/${ids.booking}/status`, { to: 'cancelled' }],
      ['catalog delete', 'delete', `/api/app/catalog/${ids.item}`, undefined],
      ['attention delete', 'delete', `/api/app/attention/${ids.attention}`, undefined],
    ];
    for (const [label, method, path, data] of cases) {
      const r = await ctxB.request[method](BASE + path, data ? { data } : {});
      same(`${label} → ${r.status()}`, `${label} → 404`);
    }
    // A's rows are untouched
    same((await sql('select count(*)::int n from products where id=$1 and deleted_at is null', [ids.item]))[0].n, 1);
    // a user without a business is sent to onboarding
    const ctxC = await ctxFor(OTHER + 'c');
    const pc = await ctxC.newPage();
    await go(pc, '/dashboard');
    ok(pc.url().includes('/onboarding'), `user without a business was not redirected to /onboarding (${pc.url()})`);
    // anonymous write
    const anon2 = await ctxFor(null);
    same((await anon2.request.put(`${BASE}/api/app/ai`, { data: {} })).status(), 401);
    await ctxB.close();
    await ctxC.close();
    await anon2.close();
  });

  // 15. privacy ---------------------------------------------------------------------------------------------------------------
  await step('privacy: no message/transcript/reply-text columns', async () => {
    const cols = await sql(`select table_name, column_name from information_schema.columns where table_schema='public' and (column_name ilike '%message%' or column_name ilike '%transcript%' or column_name ilike '%reply_text%') and not (table_name='daily_stats' and column_name='messages')`);
    same(cols.length, 0);
    if (cols.length) problem('privacy columns: ' + cols.map((c) => `${c.table_name}.${c.column_name}`).join(', '));
    const pay = await sql(`select table_name, column_name from information_schema.columns where table_schema='public' and (column_name ilike '%pay%' or column_name ilike '%card%')`);
    same(pay.length, 0);
  });

  writeReport();
} finally {
  await browser.close();
}

function writeReport() {
  fs.writeFileSync(`${OUT}/problems.txt`, problems.length ? problems.join('\n') + '\n' : '');
  log(problems.length ? `\n${problems.length} problem(s), see ${OUT}/problems.txt` : '\n0 problems');
  process.exitCode = problems.length ? 1 : 0;
}
