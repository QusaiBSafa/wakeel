// Screenshot + audit helper.  node tests/e2e/shots.mjs /dashboard /dashboard/orders …
// Needs the dev server:  HUDHUD_E2E_AUTH=1 NEXT_PUBLIC_HUDHUD_STAGING=1 DATABASE_URL=… npx next dev -p 3100
// For each path and each width in [390, 768, 1440] it writes screenshots/<slug>-<w>.png and prints
// horizontal overflow and tap targets under 40px (below 1024px).
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3100';
const OUT = process.env.SHOTS_DIR || 'screenshots';
const USER = process.env.E2E_USER || 'user_shots';
const WIDTHS = [390, 768, 1440];
const paths = process.argv.slice(2);
if (!paths.length) {
  console.error('usage: node tests/e2e/shots.mjs /path [/path …]');
  process.exit(2);
}
fs.mkdirSync(OUT, { recursive: true });
const host = new URL(BASE).hostname;
const slug = (p) => p.replace(/^\//, '').replace(/[/?=&#]+/g, '-') || 'root';

async function audit(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const small = [];
    const sel = 'button, a[href], input:not([type=hidden]):not(.visually-hidden-file), select, textarea, [role=switch], [role=tab], [role=radio]';
    if (window.innerWidth < 1024) {
      for (const el of document.querySelectorAll(sel)) {
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden' || s.display === 'none' || el.closest('[hidden]')) continue;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (el.tagName === 'A' && s.display === 'inline' && el.closest('p')) continue;
        if (el.getAttribute('role') === 'switch') continue; // ::before extends the hit area
        if (el.tagName === 'INPUT' && el.closest('label')) continue; // the label is the target
        if (b.height < 39.5 || b.width < 39.5) small.push(`${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30)}" ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }
    return { overflow, small: [...new Set(small)] };
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1440, height: 900 } });
if (process.env.HUDHUD_MOCK !== '0') await ctx.addCookies([{ name: 'e2e_user', value: USER, domain: host, path: '/' }]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

let bad = 0;
for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 900 });
    await page.waitForTimeout(250);
    const r = await audit(page);
    const file = `${OUT}/${slug(p)}-${w}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const flags = [];
    if (r.overflow > 0) flags.push(`overflow ${r.overflow}px`);
    if (r.small.length) flags.push(`small targets: ${r.small.join(' | ')}`);
    if (flags.length) bad++;
    console.log(`${p} @${w} → ${file}${flags.length ? '  ⚠ ' + flags.join('; ') : ''}`);
  }
}
if (errors.length) {
  bad++;
  console.log('errors:\n' + [...new Set(errors)].join('\n'));
}
await browser.close();
process.exit(bad ? 1 : 0);
