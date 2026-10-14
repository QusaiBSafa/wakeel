# Dashboard v2: implementation plan

Branch: `feature/dashboard`. Target: the Vercel project `hudhud-staging`. The user reviews staging and only then merges to production.

This plan is written for an implementer who has **only this file and the repo**. Read sections 0–3 once, then work through section 4 phase by phase. Do not skip the verification step of a phase. Commit at the end of every phase.

---

## 0. Ground rules (read first)

1. **Design source of truth:** `docs/design/dashboard-v2/`. For each page, read three things before writing code:
   - the markup inside `<x-dc>`, for structure, classes and copy;
   - the `class Component` script at the bottom, for states, validation, toasts and copy built in JS;
   - the shared classes in `hodhod.css`.

   The `.dc.html` files do **not** render locally because `support.js` is not in the repo. For a visual reference, open the live artifact: https://claude.ai/artifact/3V8tRdiLRcDbNeAxWM4Fur. The repo copy is identical.
2. **Prototype-only things that must never ship:**
   - the dark `.rv` "معاينة" state-switcher bar and its CSS;
   - the `views`/`startView` props;
   - the `/_blob/42cc…` logo URL (use `/logo.svg`);
   - all hard-coded sample data (رنا، مركز لمسة، SEED arrays).
3. **Non-negotiable product rules** (from `README.md`). Every phase must preserve them:
   - **No conversations are stored or shown.** No inbox, no transcripts, no message text from customers anywhere: not in the DB, the API, the UI or the logs. «تحتاج تدخلك» shows only the reason, the customer's name and phone, a link to the related order or booking, and the reply composer. **The reply text is sent (stubbed this round) and never persisted.** The «جرّب هُدهُد» test chats live in React state only and never call the server.
   - **No payment method or payment type** anywhere: no column, DTO field, API field, constant, FAQ template or UI. The Orders prototype script still has leftover `PAY`, `pay`, `payText`, `setPay` and `pay:` seed fields. **Ignore them.** They are not rendered and must not be implemented.
   - **All UI copy is Modern Standard Arabic (فصحى), RTL.** Prototype copy is final unless it is clearly sample data. Every existing string on the branch is in Palestinian dialect («مش»، «عشان»، «هالـ»، «لسّا»، «بدك») and must be replaced. That includes API error messages, Zod messages and auth pages.
   - Currency is ₪ only. The phone placeholder is `+970 59 123 4567`.
4. **Gender-neutral defaults:** the prototype's feminine forms describe one sample salon («الموظفة»، «كل الموظفات»، «مالكة الحساب»، «المالكة»، «العميلة»، «أكّدتِ»). Use MSA generic masculine everywhere instead: «الموظف»، «كل الموظفين»، «مالك الحساب»، «المالك»، «العميل». Keep everything else verbatim.
5. **No new UI framework.** No Tailwind, no component library, no SWR or React Query. The allowed new runtime dependencies are `date-fns` and `@date-fns/tz` (time zone math), nothing else.
6. Next.js 16 conventions:
   - `params` and `searchParams` are Promises;
   - the middleware file is `proxy.ts`;
   - pages that read the session export `dynamic = 'force-dynamic'`.
7. **Commands every phase must pass before its commit:**
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
   For UI phases, also run the screenshot script (P1 creates it) at **390, 768 and 1440** px. Look at the PNGs side by side with the artifact.

---

## 1. Audit of the branch as it is today (commit `1cfa38c`)

### 1.1 Stack and infrastructure (keep)

| Area | Today | Verdict |
| --- | --- | --- |
| Framework | Next.js 16 app router, React 19, TypeScript, ESLint (next core-web-vitals), Vitest | Keep |
| DB | Drizzle ORM. Neon serverless driver on Neon, `pg` locally (`lib/db/index.ts`). Migrations in `drizzle/`, applied by `scripts/migrate.mjs` during `vercel-build` | Keep the pattern |
| Auth | Clerk (`@clerk/nextjs` v7, `arSA` localization). `proxy.ts` runs `clerkMiddleware` only on `/dashboard`, `/onboarding`, `/sign-in`, `/sign-up`, `/api/app/*`, `/api/uploads`. Pages use `pageSession()`, APIs use `requireBusiness()` (owner-only, by `owner_user_id`) | Keep |
| Local auth mock | `HUDHUD_E2E_AUTH=1` aliases Clerk to `tests/e2e/clerk-mock/*` (cookie `e2e_user`) | Keep and extend (P1) |
| Blob | Private Vercel Blob store for product photos and logos (`/api/uploads` client tokens, `/media/[...path]` proxy), plus `orders/` lead requests | Keep |
| Analytics | `components/Clarity.tsx`, id `yw1mpfxfq9` (overridable by `NEXT_PUBLIC_CLARITY_ID`), tags environment `staging` on preview, identifies by Clerk user id only | Keep |
| Region | `vercel.json`: `regions: ["fra1"]`, `buildCommand: npm run vercel-build` | Keep |
| Landing | `public/index.html`, served at `/` by a rewrite. Its only app link is `/sign-in` | Out of scope, do not touch |
| Lead form backend | `/api/order` (Blob `orders/`) and `/admin` (basic auth). The landing form was removed in `5e8f5d2` | Out of scope, leave as is |

### 1.2 Routes today

| Route | File | v2 fate |
| --- | --- | --- |
| `/dashboard` | `app/dashboard/page.tsx`: readiness %, setup checklist, FAQ preview chat | **Rewrite** to v2 Home |
| `/dashboard/products` | product grid/list, modal editor, soft delete + undo, SKU | **Replace** with `/dashboard/catalog` (redirect old URL) |
| `/dashboard/booking` | weekly ranges (≤4 per day), slot length, buffer, closures, autosave | **Replace** with `/dashboard/bookings` (redirect) |
| `/dashboard/info` | business info **including payment methods**, delivery toggle with free-text areas, autosave | **Replace** with `/dashboard/business` (redirect) |
| `/dashboard/faq` | template questions with open/answered/skipped statuses | **Rewrite** to the v2 FAQ model |
| `/dashboard/account/[[...rest]]` | Clerk `<UserProfile>` | **Replace** with the v2 Account page. Profile and sign-out move to a Clerk `<UserButton>` in the sidebar footer |
| `/onboarding` | old 4-step wizard (`components/app/Onboarding.tsx`), creates the business | **Rewrite** to the 8-step v2 wizard |
| `/sign-in`, `/sign-up` | Clerk with `AuthCard` | Keep. Restyle and change the copy to MSA |
| — | (missing) | **New:** `/dashboard/attention`, `/dashboard/orders`, `/dashboard/ai` |

### 1.3 API today (`app/api/app/*`, all Clerk + business-scoped)

| Endpoint | v2 fate |
| --- | --- |
| `GET state` (whole AppState) | **Remove**; each page loads its own data on the server |
| `POST/PATCH business` (incl. `paymentMethods`) | **Rewrite** as per-section PATCH. Payment removed |
| `PUT booking` (ranges, slot, buffer) | **Remove**. Replaced by `PUT availability` |
| `closures`, `closures/[id]` | **Fold** into `PUT availability` (holidays save with the dirty bar) |
| `faqs`, `faqs/[id]` | **Rewrite** for the new FAQ model |
| `products`, `products/[id]`, `products/[id]/restore` | **Rewrite** as `catalog/*`. Keep the soft-delete + restore + `purgeDeleted` pattern from `lib/server/products.ts` |
| `notify` ("tell me when WhatsApp is ready") | **Remove**, together with the `notify_requests` table |

### 1.4 DB schema today (`lib/db/schema.ts`, migration `0000_init`)

`businesses`:
- `category` enum (clinic/salon/restaurant/shop/other)
- `payment_methods text[]` (**remove**)
- `delivery jsonb {enabled, areas (free text), feeMinor, time}`
- `hours_mode`, `hours_text`
- `onboarding_step`, `onboarded_at`
- plus logo, address, map, phone and socials

Other tables:
- `products`: `sku` (unique), price, currency, description, image, `deleted_at`
- `booking_settings`: enabled, `slot_minutes`, `buffer_minutes`, timezone
- `availability` (ranges) and `open_days`
- `closures`
- `faqs`: `template_key`, question, answer, `status` (open/answered/skipped), position
- `notify_requests`

### 1.5 Env vars today

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Staging Neon |
| `BLOB_READ_WRITE_TOKEN` | Implicit for `@vercel/blob` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Implicit for Clerk |
| `NEXT_PUBLIC_CLARITY_ID` | Optional, defaults to `yw1mpfxfq9` |
| `NEXT_PUBLIC_VERCEL_ENV` | System variable |
| `ADMIN_USER`, `ADMIN_PASSWORD` | `/admin` |
| `HUDHUD_E2E_AUTH`, `BASE_URL`, `SHOTS_DIR`, `E2E_USER`, `HUDHUD_MOCK` | Local tests only |

### 1.6 Conversations and payment: findings

- **Conversation storage:** none exists on this branch. No table, route or component stores message text; a grep for `conversation|transcript|inbox|message` finds only error-message plumbing. The only thing that looks like a chat is the static "هيك رح يرد هُدهُد" preview on the old Home, which renders the owner's own FAQ answer. It is deleted with the old Home. v2 adds **no** message-content storage either (see 3.2).
- **Payment is present and must go:**
  - `businesses.payment_methods` column;
  - `PAYMENT_METHODS`/`PAYMENT_KEYS`/`PaymentMethod` in `lib/constants.ts`;
  - the `paymentMethods` DTO field (`lib/types.ts`, `lib/server/state.ts`, `lib/defaults.ts`);
  - the Zod field in `lib/validation.ts`;
  - the «طرق الدفع» readiness check in `lib/readiness.ts`;
  - the «الدفع والتوصيل / طرق الدفع» UI in `app/dashboard/info/page.tsx`;
  - the PATCH handler line in `app/api/app/business/route.ts`;
  - the FAQ templates `common.payment` («شو طرق الدفع المتاحة؟») and shop «في دفع عند الاستلام؟»;
  - the e2e checks `paymentMethods.includes('cash')` and `getByLabel('كاش')`.

  P2 removes all of them, including a migration that drops the column and deletes the seeded payment FAQ rows.

### 1.7 Components and libs: reuse, change or delete

| File | Fate |
| --- | --- |
| `lib/db/index.ts`, `scripts/migrate.mjs`, `drizzle.config.ts`, `proxy.ts` | Keep as is |
| `lib/server/api.ts` (`handler`, `HttpError`, `parseBody`, `requireBusiness`, `assertUuid`) | Keep. Change messages to MSA. Map Postgres `23P01` (exclusion violation) to 409 «هذا الوقت محجوز» |
| `lib/server/session.ts` | Keep |
| `lib/server/media.ts`, `app/api/uploads`, `app/media/[...path]`, `lib/client/image.ts`, `lib/client/upload.ts` | Keep (catalog photos) |
| `lib/client/api.ts` | Keep. MSA messages: `'تعذّر الاتصال، تحقّق من الإنترنت'`, `'حدث خطأ، أعد المحاولة'` |
| `lib/money.ts` | Keep `parsePriceToMinor` and `minorToInput`. Add `formatMoney`. Remove multi-currency `priceLabel` usage |
| `lib/slots.ts` | Move `toMin`, `hhmm` and `fmt` into `lib/time.ts`. The rest is replaced by `lib/availability.ts` |
| `lib/validation.ts` | Keep `clean` and `validateOrder` (landing). Rewrite everything else, MSA, no payment |
| `lib/constants.ts`, `lib/types.ts`, `lib/defaults.ts`, `lib/readiness.ts`, `lib/server/state.ts`, `lib/server/products.ts` | Rewrite or split (see P2, P3) |
| `components/Clarity.tsx` | Keep |
| `components/clerk-appearance.ts`, `components/AuthCard.tsx` | Restyle with the v2 tokens, MSA copy |
| `components/ui/Logo.tsx` | Keep |
| `components/ui/Modal.tsx` | Reuse its focus-trap logic inside the new `Dialog` and `Drawer` primitives, then delete it |
| `components/ui/icons.tsx`, `components/ui/Switch.tsx` | Replace with `components/ui/Icon.tsx` and the `.sw` switch |
| `components/app/*` (AppShell, Store, States, ToastView, WaModal, WelcomeToast, Onboarding, PhotoPicker) | Delete. PhotoPicker's upload and resize logic moves into the catalog `ImageField` |
| `app/globals.css` (`.hh` theme) | Delete. Replaced by `app/styles/hodhod.css` + `app/styles/app.css` |
| `tests/slots.test.ts`, `tests/validation.test.ts` | Replace or update (P2) |
| `tests/e2e/walkthrough.mjs` | Rewrite for v2 (section 5) |

### 1.8 Gap against v2, page by page

| v2 page | What exists | Gap |
| --- | --- | --- |
| Shell (Sidebar) | Top header + left nav, old look | New right sidebar (268px) with a business card, WA status pill (on/off/warn), counts on «تحتاج تدخلك» and «الطلبات», a «الإعدادات» group, a user footer. Below 1024px: top bar + drawer + attention shortcut. Nav hides sections switched off |
| الرئيسية | Readiness checklist | Everything new: status banner (on/paused/WA off/new account) + pause dialog, 4 stats, attention top 3, recent orders, upcoming bookings, today's activity numbers, privacy note |
| تحتاج تدخلك | — | New table, list, composer (write / instruct, suggestion chip, «دع هُدهُد يتابع»), wa.me link, resolve dialog (hard delete), «تم حلها اليوم» count |
| الطلبات | — | New orders, items and events tables. Tabs with counts, search, date range, table/cards, drawer (view/edit/new), totals with delivery fee and free-over rule, status flow, cancel with reason, timeline |
| الحجوزات | Weekly ranges + slot length | New model: per-day open/close + one break, per-service duration and buffer, staff (team members), leaves, rules (lead, horizon, auto-confirm), bookings with an overlap constraint. Day grid / week / list views, drawer, reschedule and new booking with slot picker and conflict check |
| المنتجات والخدمات | Products only, SKU, single price | Add kind (product/service), variants, stock mode and qty, visibility, service duration, staff and days. Drop SKU and currency in the UI. Tabs, filters, drawer editor, delete + undo |
| معلومات نشاطك | One autosaving form incl. payment | Per-section view/edit cards with «آخر تحديث», completeness (7 checks), hours from bookings (read-only), delivery areas table + free-over + toggle, extra rules list. **No payment** |
| الأسئلة الشائعة | Template statuses | New model: answer required (≤500 chars), category, enabled, alternative phrasings, usage count, soft delete + undo. Suggestions by business type with dismiss, search, category chips, preview |
| إعدادات هُدهُد | — | New `ai_settings`: master switch + pause duration, mode, language, tone, name, emoji, permissions, handoff rules, notify channels, unknown-answer behaviour, dirty bar, test chat (client-only) |
| إعدادات الحساب | Clerk profile | WhatsApp tab (connected / needs attention / disconnected, disconnect, renew, after-hours behaviour), team + invites + roles, plan usage, show/hide sections |
| إعداد الحساب (Onboarding) | 4 steps | 8 adaptive steps, save and resume, resume card, WhatsApp connect flow (stub), summary + test chat + activate, live screen |

---

## 2. Architecture decisions

### 2.1 Styles

- Copy `docs/design/dashboard-v2/hodhod.css` **verbatim** to `app/styles/hodhod.css`, with three edits:
  1. delete the `.rv` rules (the "prototype review bar" block, lines starting `.rv` around line 322, plus `.rv{padding…}` inside the 1023px media query);
  2. in `.hd`, set `--font:var(--font-plex),var(--font-tajawal),system-ui,sans-serif;` and `--font-display:var(--font-tajawal),var(--font-plex),sans-serif;`;
  3. nothing else. Keep the class names exactly so the prototype markup ports 1:1.
- Create `app/styles/app.css` for what the prototypes don't cover:
  - auth pages (`.auth-wrap`, `.auth-card`, ported from the old `globals.css` but using v2 tokens);
  - Clerk element overrides;
  - `.staging-bar` (see 2.9);
  - the drop zone file input;
  - any class you extract from repeated inline styles.
- `app/layout.tsx` imports `./styles/hodhod.css` then `./styles/app.css`. Delete `app/globals.css`.
- Inline `style` attributes in the prototypes may be ported as React `style={{…}}` objects. Keep the values identical. Extract to `app.css` only when a style repeats across three or more places.
- Global (unscoped) helpers from hodhod.css (`.ltr`, `.num`, `.muted`, `.subtle`, `.sr-only`) are fine. The landing page is a static file and does not load them.

### 2.2 RTL and fonts

- `<html lang="ar" dir="rtl" className={`${plex.variable} ${tajawal.variable}`}>` and `<body className="hd">`.
- `next/font/google`:
  - `IBM_Plex_Sans_Arabic({ weight: ['400','500','600','700'], subsets: ['arabic'], display: 'swap', variable: '--font-plex' })`
  - `Tajawal({ weight: ['500','700','800'], subsets: ['arabic'], display: 'swap', variable: '--font-tajawal' })`
- Remove the Google Fonts `<link>` tags and the eslint-disable comment from `app/layout.tsx`.
- `viewport.themeColor` stays `#F7F8F4`.
- Numbers use Western digits with `.num` (tabular). Phone numbers and URLs are wrapped in `.ltr`.

### 2.3 Shell layout

- `app/dashboard/layout.tsx` (server component):
  1. `pageSession()`; with no business → `redirect('/onboarding')`. Do **not** redirect when onboarding is unfinished: Home shows the «لنبدأ تشغيل هُدهُد» banner instead.
  2. `loadShell(business)` → `ShellData` (see P3).
  3. Render `<AppProviders><Shell data={…}>{children}</Shell></AppProviders>`.
- `components/shell/Shell.tsx` (client) renders, in this order inside a fragment:
  - `<aside class="sb">` (desktop);
  - `<header class="mbar">` (below 1024px, CSS switches it);
  - the drawer (`.mscrim` + `.mdrawer`, when open);
  - `<div class="content">{children}</div>`.

  Each page renders its own `<main class="page" id="main">`.
- Nav data lives in `components/shell/nav.ts`. Keys, labels, hrefs and icons are exactly the `NAV`/`SETTINGS` arrays of `Sidebar.dc.html`, with hrefs mapped to the new routes:
  - home `/dashboard`
  - attention `/dashboard/attention`
  - orders `/dashboard/orders`
  - bookings `/dashboard/bookings`
  - catalog `/dashboard/catalog`
  - business `/dashboard/business`
  - faq `/dashboard/faq`
  - ai `/dashboard/ai`
  - account `/dashboard/account`
- The active item comes from `usePathname()`.
- Counts:
  - attention = open items (`count hot`, aria-label `${n} طلبات مساعدة مفتوحة`), shown only when > 0;
  - orders = status `new` (`count warm`, `${n} طلبات جديدة`).
- Hidden sections:
  - `sections.orders === false` hides «الطلبات»;
  - `sections.bookings === false` hides «الحجوزات»;
  - products and services both off hides «المنتجات والخدمات».
- WA pill (`waCls`/`waDot`/`waText` logic from the Sidebar script):
  - on → «واتساب متصل · هُدهُد يعمل»
  - off → «واتساب غير متصل»
  - warn → «الاتصال يحتاج إلى انتباه»

  Map the DB status `connected` → on, `needs_attention` → warn, `disconnected`/none → off.
- Business card: `.av c{n}`, where `n` is a stable hash of the business id mod 8, and the initial is the first letter of the name.
- Footer:
  - the owner's name (Clerk `firstName lastName`, falling back to the owner team-member name);
  - the subtitle «مالك الحساب»;
  - a Clerk `<UserButton userProfileMode="modal" />` in place of the gear `ib` (it opens profile, email, password and sign-out);
  - keep a gear link to `/dashboard/account` next to it.
- Mobile drawer: `role="dialog" aria-modal="true"`, focus trap, Escape closes, closes on route change. The open button has `aria-expanded` and `aria-controls="m-drawer"`.
- After any mutation that changes counts or status, the page calls `router.refresh()`. That re-runs the layout loader. No client cache library.

### 2.4 State and data fetching

- **Reads:** each `page.tsx` is a server component. It calls a typed loader from `lib/server/loaders/<page>.ts` and passes plain DTOs to one client component, `app/dashboard/<page>/<Page>Client.tsx`. Loaders always scope by `business.id` from the session; they never take ids from the client.
- **Writes:** `fetch` through `lib/client/api.ts` to `/api/app/...` route handlers wrapped in `handler()`.
  - Every body is parsed with a **`.strict()`** Zod schema in `lib/validation/<area>.ts`, so unknown keys such as `paymentMethod` are rejected with 400.
  - Handlers return the updated entity DTO. The client replaces its local copy, shows the toast, and calls `router.refresh()` when shell counts may change.
- **Filtering and search** happen client-side over what the loader returned. Limits:
  - orders: last 90 days, max 500;
  - bookings: the visible range;
  - catalog, FAQ and attention: all rows.

  Bookings fetch more ranges with `GET /api/app/bookings?from=&to=` when the user navigates.
- **No autosave.** v2 uses explicit saves: section "حفظ" buttons and dirty bars. Delete the debounced `Store`. Pages with a dirty bar (Bookings availability, AI settings) add a `beforeunload` guard while dirty.
- **Dates:** the business time zone is always `Asia/Hebron` (`lib/time.ts` exports `TZ`). Store `timestamptz`. Convert with `@date-fns/tz` (`TZDate`). Arabic formatting is hand-written (2.5), not `Intl` month names, because the design uses the Levantine «تشرين الأول».

### 2.5 Formatting helpers (`lib/format.ts`, unit tested)

| Helper | Output |
| --- | --- |
| `formatMoney(minor)` | `"1,240 ₪"` (en-US grouping). Up to 2 decimals only when non-zero (`"12.5 ₪"`) |
| `MONTHS` | `['كانون الثاني','شباط','آذار','نيسان','أيار','حزيران','تموز','آب','أيلول','تشرين الأول','تشرين الثاني','كانون الأول']` |
| `DAYS` | Saturday-first: `['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة']`. Weekday index `0 = Saturday … 6 = Friday`, as today |
| `clock(min)` | `"11:30 ص"` (12-hour, ص/م). Reuse `fmt` |
| `relDay(date)` | «اليوم 10:12 ص» / «أمس 6:20 م» / «12 تشرين الأول» |
| `waitText(ms)` | «4 دقائق»، «25 دقيقة»، «دقيقتين»، «ساعة»، «ساعتين»، «3 ساعات», with Arabic number agreement: 1 دقيقة، 2 دقيقتين، 3–10 دقائق، 11+ دقيقة; the same for hours |
| `agoText(date)` | «الآن»، «قبل دقيقتين»، «قبل 3 أيام»، «قبل أسبوع»، «قبل أسبوعين»، «قبل شهر» (for «آخر تحديث») |
| `durText(min)` | The prototype map: 30→«30 د», 45→«45 د», 60→«ساعة», 90→«ساعة ونصف», 120→«ساعتان», 150→«ساعتان ونصف», 240→«4 ساعات», else `${n} د` |
| `dateTitle(d)` | «الأربعاء 14 تشرين الأول» |
| `waLink(phone)` | `https://wa.me/<digits>`. `telLink(phone)` → `tel:<no spaces>` |
| `PHONE_RE` | `/^\+?[\d][\d\s\-()]{7,18}$/` (all prototypes). `URL_RE` = `/^https?:\/\/\S+$/i` |

### 2.6 Loading, empty and error states

- Every dashboard route has `loading.tsx`, reproducing that page's prototype skeleton (`.sk` blocks inside `aria-busy="true" aria-label="جاري التحميل"`).
- Every dashboard route has `error.tsx` (client) rendering `<ErrorCard title text onRetry={reset} />` with the page's own copy from the prototype:

  | Page | Title | Text |
  | --- | --- | --- |
  | Home | تعذّر تحميل الصفحة | حدثت مشكلة في الاتصال. لا يزال هُدهُد يعمل ويرد على عملائك، لكن الأرقام غير متاحة حالياً. |
  | Attention | تعذّر تحميل الطلبات | حدثت مشكلة في الاتصال. إذا طال انتظار أي عميل، يعتذر له هُدهُد ويبلغه بأنك سترد قريباً. |
  | Orders | تعذّر تحميل الطلبات | لا يزال هُدهُد يسجّل الطلبات الجديدة، لكن تعذّر عرض القائمة الآن. |
  | Bookings | تعذّر تحميل التقويم | الحجوزات محفوظة، ولا يزال هُدهُد يستقبل حجوزات العملاء. |
  | Catalog | تعذّر تحميل القائمة | لا يزال هُدهُد يستخدم آخر نسخة محفوظة من منتجاتك. |
  | Business | تعذّر تحميل معلومات نشاطك | لا يزال هُدهُد يستخدم آخر نسخة محفوظة من المعلومات. |
  | FAQ | تعذّر تحميل الأسئلة | لا يزال هُدهُد يستخدم آخر نسخة محفوظة من أجوبتك. |
  | AI | تعذّر تحميل الإعدادات | لا يزال هُدهُد يعمل بآخر إعدادات محفوظة. |

  The button is «أعد المحاولة» with the retry icon. Account and Onboarding use the AI-page copy pattern («تعذّر تحميل الصفحة» + «حدثت مشكلة في الاتصال.»).
- Empty states: each page's `isEmpty`/`noMatch` blocks, verbatim.
- Mutation errors: a toast with `kind: 'bad'` showing the API error message. Form validation errors stay inline (`.input.bad` + `.err`), shown only after the first submit attempt (`touched`), as in the prototypes.

### 2.7 Toasts and dialogs (`components/ui/`)

| Component | Behaviour |
| --- | --- |
| `ToastProvider` + `useToast()` | `toast(text, { kind?: 'ok'\|'bad', undo?: () => void })`. One toast at a time, replaced by the next. Auto-hide after 3200 ms (4000 ms with undo). Renders `<div class="toast ok\|bad" role="status" aria-live="polite">` with an icon (check, or the `!` path for bad) and, with undo, `<button>تراجع</button>`. Mount once in `AppProviders` |
| `Dialog` | Props: `open`, `onClose`, `labelledBy`, `describedBy`, `role='alertdialog'`. Markup: `.backdrop > .dialog > .dialog-body + .dialog-foot`. Backdrop click and Escape close it. Focus trap and focus restore are ported from `components/ui/Modal.tsx`. Render through a portal into `document.body` |
| `Drawer` | Props: `open`, `onClose`, `labelledBy`. Markup: `.scrim` + `aside.drawer-r role=dialog aria-modal=true` with slots `head`, `body` and `foot` → `.drawer-head`, `.drawer-body`, `.drawer-foot`. Same focus handling |
| Primitives | `Sw` (the `.sw` switch button with `role=switch aria-checked`), `Seg` (`.seg` group with `aria-pressed`), `Tabs` (`.tabs > .tab` with `role=tab aria-selected`; panels plain), `RadioCard` (`label.radio-card`), `Check` (`label.check`), `Chip`, `Badge`, `Avatar` (`.av c{n}`), `Count`, `Skeleton`, `EmptyState`, `ErrorCard`, `Icon` |

`Icon`: `components/ui/Icon.tsx`, a `Record<IconName, string>` of SVG path strings copied from the prototypes (nav icons, alert, check, close, plus, trash, edit, search, chevrons, whatsapp, phone, retry, clock, user, bag, calendar, tag, store, faq, sliders, pause, play, lock, info). It renders `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d=…/></svg>`.

### 2.8 Mobile and accessibility

- Breakpoints come from hodhod.css: 1279, 1023, 767 and 359 px.
- Tables (`.hide-m`) switch to card lists (`.only-m`) under 768px, exactly as in the prototypes.
- Tap targets must be at least 40px under 1024px (README). The e2e audit enforces it.
- Keep every `aria-*` the prototypes set: tablists, `aria-current`, `aria-live` and labels on icon buttons.
- Clarity privacy:
  - put `data-clarity-mask="true"` on the `<main>` of Attention, Orders and Bookings, on the Account team tab, and on all drawers and forms that show customer names or phones;
  - Clarity must never receive message text. There is none, by design.

### 2.9 Real versus stubbed this round

| Feature | Staging this round |
| --- | --- |
| All CRUD for orders, bookings, catalog, business, FAQ, AI settings, account sections, after-hours, team rows, onboarding progress | **Real** (DB) |
| Availability slots + conflict check | **Real** (server computes; DB exclusion constraint) |
| Pause/resume هُدهُد (`ai_settings.enabled`, `paused_until`) | **Real** state (no bot reads it yet) |
| WhatsApp/Meta connect (start → pick number → OTP → done), renew, quality, "messages this month" | **STUB.** `POST /api/app/whatsapp/connect/*` returns fake numbers. Any 6-digit code except `000000` succeeds. The connection row has `is_stub = true` |
| Disconnect | Real DB state change (stub connection) |
| Sending anything to customers («أُرسلت رسالة إلى العميل», attention replies, invites by WhatsApp) | **STUB.** No send. The server logs `[stub-send] kind=<kind> business=<id>`, **never** the text. Order and booking events still record the action text («تم تأكيد الطلب وأُرسلت رسالة إلى العميل») |
| «جرّب هُدهُد» test chats (AI settings, onboarding step 8) | **STUB, client only.** Port the prototype `reply()`/`answer()` rule functions into `lib/client/test-chat.ts`. Never saved, never sent to the server |
| Attention items, orders/bookings from the bot, daily stats | No bot yet. Rows come from (a) the staging demo seeder and (b) an optional ingest endpoint for the future bot (P15) |
| Team invites | Rows are real (`status = pending`). No Clerk invitation and no WhatsApp message. Invited members cannot sign in this round |
| Plan / billing | Static plan constants + real usage counts. «اطّلع على الباقات» → toast «تفاصيل الباقات قريباً» (as designed) |
| Notification channels (dashboard / WhatsApp / email) | Stored only |

Stub visibility: when `NEXT_PUBLIC_HUDHUD_STAGING=1`, the shell renders a thin `.staging-bar` above `.content`, with dark styling like `.rv`, `role="note"` and the text «نسخة تجريبية: ربط واتساب وإرسال الرسائل محاكاة، ولا يُرسل شيء إلى العملاء.». It has two buttons:
- «أضف بيانات تجريبية» → `POST /api/app/dev/seed`;
- «امسح البيانات التجريبية» → `DELETE /api/app/dev/seed`.

The bar and both endpoints exist only when the env flag is `1`. The endpoints return 404 otherwise, and always when `VERCEL_ENV === 'production'`.

---

## 3. Data model, API and migrations

### 3.1 Migration mechanics (read before P2)

- Never rename tables or columns: `drizzle-kit generate` would prompt interactively. Add new, copy, then drop old.
- Use three migrations per schema change:
  1. **Additive.** Edit `lib/db/schema.ts` to add the new tables, columns and enums, keeping the old ones. Run `npx drizzle-kit generate --name v2_add`.
  2. **Data.** Run `npx drizzle-kit generate --custom --name v2_data` and write the SQL by hand.
  3. **Drop.** Remove the old fields from `schema.ts`. Run `npx drizzle-kit generate --name v2_drop`. Review the SQL. It must only drop.
- `drizzle-kit generate` needs no database. Apply with `npm run db:migrate` against local Postgres (P0) and check that the result is idempotent: running it twice is a no-op.
- Things Drizzle cannot express (the exclusion constraint, the `btree_gist` extension, CHECKs that reference functions) go into the custom data migration as raw SQL. Leave a comment in `schema.ts` saying where they live.

### 3.2 Final schema (P2 implements all of it)

Conventions:
- `id uuid pk default gen_random_uuid()`;
- `business_id uuid not null references businesses(id) on delete cascade`, with an index on it;
- money is `integer` minor units (agorot);
- times are `timestamptz`;
- minutes since midnight are `smallint`;
- `weekday smallint 0..6` (Saturday = 0);
- `orders`, `bookings`, `attention_items`, `team_members`, `products`, `faqs` and `delivery_areas` also get `demo boolean not null default false`, which marks rows created by the staging demo seeder (P4).

**Enums (new):**

| Enum | Values |
| --- | --- |
| `business_type` | `salon`, `food`, `clothes`, `clinic`, `tech`, `other` |
| `item_kind` | `product`, `service` |
| `stock_mode` | `always`, `qty`, `out` |
| `order_status` | `new`, `confirmed`, `preparing`, `out`, `delivered`, `cancelled` |
| `order_cancel_reason` | `customer`, `stock`, `area`, `other` |
| `actor` | `ai`, `owner`, `customer`, `system` |
| `booking_status` | `pending`, `confirmed`, `done`, `cancelled` |
| `team_role` | `owner`, `admin`, `staff`, `book` |
| `member_status` | `active`, `pending` |
| `wa_status` | `connected`, `needs_attention`, `disconnected` |
| `faq_category` | `general`, `bookings`, `prices`, `delivery`, `products` |
| `after_hours` | `reply`, `away` |

Labels:
- `faq_category`: عام، الحجوزات، الأسعار، التوصيل، المنتجات.
- Business type labels for the Business page select: `salon` «صالون ومركز تجميل», `clinic` «عيادة», `food` «مطعم أو مخبز», `clothes` «متجر ملابس», `tech` «متجر إلكترونيات», `other` «خدمات أخرى».
- Onboarding cards use the `TYPES` array in `Onboarding.dc.html` (labels, examples, icon paths and default offers).

**`businesses`** (modify):
- **keep:** `id`, `owner_user_id`, `name` (make the default `''`, still not null), `description`, `address`, `map_url`, `phone`, `socials` (only `instagram`, `facebook` and `website` are used), `logo_*` (kept, unused in v2 UI), `onboarded_at` (meaning: «هُدهُد activated»), timestamps;
- **add:**
  - `type business_type not null default 'other'`
  - `offers jsonb not null default '{"products":true,"services":false,"delivery":false}'`
  - `city text not null default ''`
  - `landmark text not null default ''`
  - `parking text not null default ''`
  - `returns_policy text not null default ''`
  - `cancel_policy text not null default ''`
  - `rules text[] not null default '{}'` (max 20, each ≤200 chars)
  - `delivery_enabled boolean not null default false`
  - `free_over_minor integer` (null = no free delivery)
  - `sections jsonb not null default '{"orders":true,"bookings":true,"products":true,"services":true,"delivery":true}'`
  - `after_hours after_hours not null default 'reply'`
  - `section_updated jsonb not null default '{}'` (`{basic,location,contact,policy,delivery,hours}` → ISO strings)
  - `onboarding jsonb not null default '{"step":1,"maxStep":1,"skipped":[]}'`
  - `dismissed_faq_suggestions text[] not null default '{}'`
  - `next_order_no integer not null default 1001`
  - `next_booking_no integer not null default 101`
- **drop:** `category` (+ enum `business_category`), `payment_methods`, `delivery`, `hours_mode` (+ enum), `hours_text`, `onboarding_step`.

**`team_members`** (new):
- `id`, `business_id`;
- `clerk_user_id text` (unique when not null);
- `name text not null`, `phone text not null default ''`, `email text not null default ''`;
- `role team_role not null`, `status member_status not null default 'active'`;
- `color smallint not null` (0–7);
- `provides_services boolean not null default true`;
- `created_at`.

The owner row is created together with the business (role `owner`, `provides_services = false`, name from Clerk). Bookable staff = members with `provides_services`. If none exist, the owner is treated as the single bookable member (calendar column = owner). See open question Q1.

**`products`** (keep the table name; in code export it as `catalogItems`):
- **add:**
  - `kind item_kind not null default 'product'`
  - `variants jsonb not null default '[]'` (`[{name, priceMinor}]`, max 10)
  - `stock_mode stock_mode not null default 'always'`
  - `stock_qty integer`
  - `active boolean not null default true`
  - `duration_min smallint` (services)
  - `buffer_min smallint not null default 0`
  - `days smallint[] not null default '{0,1,2,3,4,5,6}'`
  - `position integer not null default 0`
- **drop:** `sku` and its unique index. `currency` stays (default ILS) but is not exposed.
- **CHECK:** `kind <> 'service' or duration_min between 5 and 480`.

**`service_staff`** (new): `item_id → products on delete cascade`, `member_id → team_members on delete cascade`. PK (`item_id`, `member_id`).

**`business_hours`** (new, replaces `availability` + `open_days`): `business_id`, `weekday`, `open boolean`, `open_min`, `close_min`, `break_start_min` (null), `break_end_min` (null). PK (`business_id`, `weekday`).
- CHECK `close_min > open_min`.
- CHECK the break is either fully null or `open_min <= break_start_min < break_end_min <= close_min`.

**`booking_settings`** (modify):
- add `lead_minutes smallint not null default 120`, `horizon_days smallint not null default 30`, `auto_confirm boolean not null default true`;
- drop `enabled`, `slot_minutes` and `buffer_minutes` with their CHECKs;
- keep `timezone`.

**`closures`** (keep) = holidays.

**`staff_leaves`** (new): `id`, `business_id`, `member_id → team_members cascade`, `from_date date`, `to_date date` (CHECK `to_date >= from_date`), `note text default ''`.

**`bookings`** (new):
- `id`, `business_id`, `number integer not null` (unique (`business_id`, `number`), displayed `B-<n>`);
- `customer_name text not null`, `customer_phone text not null`;
- `item_id → products on delete set null`;
- snapshots: `service_name text not null`, `price_minor integer not null`, `duration_min smallint not null`, `buffer_min smallint not null default 0`;
- `member_id → team_members on delete set null`;
- `starts_at timestamptz not null`, `ends_at timestamptz not null`, `blocked_until timestamptz not null` (= `ends_at` + buffer);
- `status booking_status not null`, `source actor not null`;
- `cancelled_at timestamptz`, `created_at`, `updated_at`;
- index (`business_id`, `starts_at`).
- In the custom migration:
  ```sql
  CREATE EXTENSION IF NOT EXISTS btree_gist;
  ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (member_id WITH =, tstzrange(starts_at, blocked_until) WITH &&)
    WHERE (status IN ('pending','confirmed') AND member_id IS NOT NULL);
  ```

**`delivery_areas`** (new): `id`, `business_id`, `name text not null`, `fee_minor integer not null default 0`, `eta text not null`, `position`.

`eta` is one of «في اليوم نفسه»، «يوم عمل واحد»، «يوم إلى يومي عمل»، «يومان إلى ثلاثة أيام عمل». Copy the exact option list from the `<select>` in `Business.dc.html`. Validate against a constant.

**`orders`** (new):
- `id`, `business_id`, `number integer not null` (unique per business, shown `#1043`);
- `customer_name`, `customer_phone`;
- `status order_status not null default 'new'`, `is_draft boolean not null default false`, `source actor not null`;
- `pickup boolean not null default false`;
- `area_id → delivery_areas on delete set null`, `area_name text not null default ''` (snapshot);
- `address text not null default ''`, `notes text not null default ''`;
- `subtotal_minor`, `delivery_fee_minor`, `total_minor` (integers, computed on the server);
- `cancel_reason order_cancel_reason`;
- `delivered_at`, `created_at`, `updated_at`;
- index (`business_id`, `created_at desc`).
- **No payment columns.**

**`order_items`** (new): `id`, `order_id → orders cascade`, `item_id → products set null`, `name text not null` (snapshot incl. variant, e.g. «شامبو أرغان · 500 مل»), `unit_price_minor`, `qty smallint` (CHECK 1–99), `position`.

**`order_events`** (new): `id`, `order_id → orders cascade`, `kind text not null` (`ai`|`wait`|`cust`|`owner`|`done`|`cancel`, the `TL_IC` keys), `text text not null` (a fixed system phrase, never customer text), `actor_name text not null`, `created_at`.

**`attention_items`** (new):
- `id`, `business_id`;
- `customer_name text not null default ''`, `customer_phone text not null`;
- `reason text not null` (≤300; written by the bot from settings, e.g. «طلبت خصماً بنسبة 20%…»);
- `ref_kind text` (`order`|`booking`|null), `ref_id uuid`;
- `suggestion text` (≤500, the AI-drafted reply the owner can use);
- `status text not null default 'open'` (`open`|`replied`);
- `hodhod_paused boolean not null default false`;
- `created_at`.
- **No message content, no reply text column.** Resolving deletes the row (the design says «تُحذف تفاصيله»).

**`daily_stats`** (new, numbers only): `business_id`, `day date`, PK (`business_id`, `day`). Integer columns, all default 0: `conversations`, `auto_replied`, `orders_logged`, `bookings_confirmed`, `handed_off`, `resolved`, `messages`, `reply_ms_total`, `replies`. Average reply = `reply_ms_total / replies`.

**`faqs`** (modify):
- add:
  - `category faq_category not null default 'general'`
  - `enabled boolean not null default true`
  - `alts text[] not null default '{}'` (max 10 × 200)
  - `usage_month text not null default ''` (`'YYYY-MM'`) and `usage_count integer not null default 0` (the count shown is `usage_count` when `usage_month` = the current month, else 0)
  - `deleted_at timestamptz` (undo)
- drop `status` (+ enum `faq_status`);
- keep `template_key` (records which suggestion the FAQ came from) and its unique index;
- `answer` becomes required in the API (≤500), the column is unchanged.

**`ai_settings`** (new): `business_id pk`, `enabled boolean not null default false`, `paused_until timestamptz` (null + `enabled=false` = paused until manually resumed), `config jsonb not null`, `updated_at`.

`config` is validated by `aiConfigSchema` (Zod) with defaults equal to the prototype `DEF`:

```ts
{ mode: 'auto'|'approve', lang: 'match'|'fusha'|'dialect', tone: 'friendly'|'formal'|'short', name: string(≤30), emoji: boolean,
  perms: { orders, bookings, resched, prices, alt, discount: boolean },
  rules: { human: true (always), complaint, unknown, discount, big, group: boolean }, bigMinor: int, groupNum: int,
  notify: { dash: true (always), wa: boolean, email: boolean },
  unk: 'handoff'|'call'|'custom', unkMsg: string(≤300) }
```

**`whatsapp_connections`** (new): `business_id pk`, `status wa_status not null`, `phone text not null`, `display_name text not null`, `connected_at`, `token_expires_at`, `disconnected_at`, `quality text not null default 'good'`, `last_reply_at`, `is_stub boolean not null default true`.

**Dropped tables:** `availability`, `open_days`, `notify_requests`.

### 3.3 Data migration SQL (`v2_data`, staging data only, written by hand)

1. `type`: `CASE category WHEN 'clinic' THEN 'clinic' WHEN 'salon' THEN 'salon' WHEN 'restaurant' THEN 'food' ELSE 'other' END` (`shop` → `other`; see Q3).
2. `offers`: products = true; services = (the old `booking_settings.enabled`); delivery = `(delivery->>'enabled')::boolean`.
3. `delivery_enabled` = `(delivery->>'enabled')::boolean`. When `delivery->>'areas'` is non-empty, insert one `delivery_areas` row: name = the left 60 chars of the old areas text, fee = `delivery->>'feeMinor'` or 0, eta «يوم عمل واحد».
4. `business_hours`, one row per weekday from `open_days` and `availability`:
   - `open` = `open_days.open` (default `weekday <> 6`);
   - `open_min` = min `start_min`, `close_min` = max `end_min`;
   - when there are ≥2 ranges, the break = end of the first range → start of the second;
   - with no ranges: 540–1020.
5. `onboarding` = `{"step":8,"maxStep":8,"skipped":[]}` where `onboarded_at` is not null, else `{"step":1,"maxStep":1,"skipped":[]}`.
6. `team_members`: insert an owner row per business (name = the business name for now; P3 refreshes it from Clerk on the next page load when it is empty or equal to the business name).
7. `ai_settings`: insert defaults per business; `enabled` = `onboarded_at is not null`.
8. `faqs`:
   - `DELETE` where `template_key IN ('common.payment','shop.4')` (payment) or `answer = ''`;
   - set `enabled = true` for the rest;
   - set `category = 'general'` for all remaining rows (the owner can recategorise them).
9. Products: `kind = 'product'`, `active = true`.
10. The `btree_gist` extension + the `bookings_no_overlap` constraint.

All statements must be safe to run when the tables are empty (fresh local DB).

### 3.4 API surface (all under `/api/app`, Clerk-only, `handler()`-wrapped, `.strict()` Zod bodies, business-scoped)

| Area | Endpoint | Body / result |
| --- | --- | --- |
| AI state | `POST ai/pause` | `{duration:'1h'\|'tmr'\|'manual'}`. `tmr` = next day 09:00 Asia/Hebron. Home's dialog sends `manual` |
| | `POST ai/resume` | → `{enabled:true}` |
| | `PUT ai` | `{config}` → saved config |
| Attention | `POST attention/[id]/reply` | `{mode:'write'\|'instruct', text: 1..1000, resume:boolean}` → stub send; sets `status='replied'`, `hodhod_paused=!resume`. **Never stores `text`** |
| | `DELETE attention/[id]` | Resolve: delete the row, `daily_stats.resolved += 1` (today) |
| Orders | `POST orders` | `{customer, phone, lines:[{itemId, variant?:string, qty}], pickup, areaId?, address, notes}` → creates `#number`, `source=owner`, event «{owner} أضاف الطلب» |
| | `PATCH orders/[id]` | Same body (edit); not allowed when delivered or cancelled; event «{owner} عدّل الطلب» |
| | `POST orders/[id]/advance` | Moves to the next status in `FLOW`; clears `is_draft`; sets `delivered_at`; event text from `NEXT_TL` |
| | `POST orders/[id]/cancel` | `{reason}`; event «أُلغي الطلب: {reason text}» |
| Bookings | `GET bookings?from=YYYY-MM-DD&to=YYYY-MM-DD` | Max 31 days → `BookingDTO[]` |
| | `GET bookings/slots?itemId&date&excludeId?` | → `{memberId, memberName, durationMin, slots:[{startMin, reason:''\|'مغلق'\|'خارج أوقات العمل'\|'استراحة'\|'انقضى الوقت'\|'محجوز'\|'عطلة'\|'غياب'\|'خارج مدة الحجز المسموحة'}]}` |
| | `POST bookings` | `{customer, phone, itemId, date, startMin}`; status = `auto_confirm ? confirmed : pending` (the owner's manual booking is always `confirmed`, as in the prototype) |
| | `PATCH bookings/[id]` | `{date, startMin}` (reschedule) |
| | `POST bookings/[id]/status` | `{to:'confirmed'\|'done'\|'cancelled'}`; only valid transitions: pending→confirmed; confirmed→done if started; pending/confirmed→cancelled |
| | `PUT availability` | `{hours:[7], rules:{leadMinutes,horizonDays,autoConfirm}, services:[{id,durationMin,bufferMin}], closures:[{date,note}]}`. Replaces hours and closures in one transaction |
| | `POST leaves`, `DELETE leaves/[id]` | `{memberId, from, to, note}` |
| Catalog | `POST catalog` | `{kind, name, description, price, variants, stockMode, stockQty, active, durationMin?, staffIds?, days?, image?}` |
| | `PATCH catalog/[id]` | Partial version of the same body (also the visibility toggle `{active}`) |
| | `DELETE catalog/[id]` | Soft delete |
| | `POST catalog/[id]/restore` | Undo |
| Business | `PATCH business` | `{section:'basic'\|'location'\|'contact'\|'policy', ...fields}` → stamps `section_updated[section]` |
| | `PUT delivery` | `{enabled?, freeOver?, areas?:[{id?,name,fee,eta}]}` |
| | `PUT business/rules` | `{rules:string[]}` |
| FAQ | `POST faqs`, `PATCH faqs/[id]` | `{question, answer(≤500), category, enabled, alts, templateKey?}` |
| | `DELETE faqs/[id]`, `POST faqs/[id]/restore` | Soft delete + undo |
| | `POST faqs/suggestions/dismiss` | `{key}` |
| Account | `PATCH account` | `{afterHours?, sections?}` |
| | `POST team` | `{name, phone, role}`; max 5 members incl. owner → 409 «وصلت إلى الحد الأقصى لأعضاء الفريق في باقتك» |
| | `PATCH team/[id]` | `{role}` |
| | `DELETE team/[id]` | The owner cannot be removed |
| WhatsApp (stub) | `POST whatsapp/connect/start` | → `{numbers:[{phone, desc}]}`; the first is the business phone (desc `{name} · واتساب للأعمال`), the second is fake (desc «رقم جديد · لم يُستخدم في واتساب») |
| | `POST whatsapp/connect/verify` | `{phone, code}` → connected |
| | `POST whatsapp/renew` | `token_expires_at` = now + 60 days, status connected |
| | `POST whatsapp/disconnect` | — |
| Onboarding | `PUT onboarding/step/[n]` | `{data, skipped?:boolean}`; `n` = 1..7 saves that step's data (table below) and updates `onboarding.{step,maxStep,skipped}`. `n=1` creates the business (+ owner member, ai_settings, booking_settings, default hours) if missing |
| | `POST onboarding/activate` | Requires WA connected → `onboarded_at = now()`, `ai_settings.enabled = true` |
| Demo (staging only) | `POST dev/seed`, `DELETE dev/seed` | See P4 |
| Ingest (P15) | `POST /api/internal/ingest` | Not under `/api/app`, no Clerk; `Authorization: Bearer $HUDHUD_INGEST_SECRET` |

Onboarding step payloads:

| Step | Payload |
| --- | --- |
| 1 | `{type, offers}`; also sets `sections` from offers |
| 2 | `{name, city, phone, address, description}` |
| 3 | `{hours:[7×{open,from,to}]}` (no break) |
| 4 | `{rows:[{id?, kind, name, price, durationMin?}]}`. Upsert; rows removed client-side are deleted only if they were created by onboarding (track their ids in `onboarding.rowIds`) |
| 5 | `{zones:[{name, on, fee}], freeOver}`. Creates or replaces `delivery_areas`; turns delivery on |
| 6 | `{faqs:[{key, question, answer, on}]}`. Upsert by `template_key`; `enabled = on` |
| 7 | WhatsApp, via the whatsapp endpoints |

Removed endpoints: `state`, `booking`, `closures*`, `products*`, `notify`, and the old `business` POST/PATCH shapes.

---

## 4. Phases

Each phase lists **Files**, **Do**, **Accept** and **Verify**. Commit with a message like `v2 P3: shell data loaders` at the end of each phase, then push to `feature/dashboard`.

### P0: Local environment baseline

**Do:**
1. `npm ci`.
2. Start local Postgres 16 (it is installed at `/usr/lib/postgresql/16/bin`):
   ```bash
   export PGDATA=/tmp/pg && /usr/lib/postgresql/16/bin/initdb -U postgres -A trust $PGDATA \
     && /usr/lib/postgresql/16/bin/pg_ctl -D $PGDATA -l /tmp/pg.log start \
     && createdb -U postgres -h localhost hudhud
   export DATABASE_URL=postgres://postgres@localhost:5432/hudhud
   npm run db:migrate
   ```
3. Confirm the baseline:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```

**Accept:** all four pass on the untouched branch. If any fails, note it in the commit message of P1 and fix it there.

### P1: Design-system foundation (no behaviour yet)

**Files:**
- **new:** `app/styles/hodhod.css`, `app/styles/app.css`
- **new:** `components/ui/{Icon,Toast,Dialog,Drawer,Sw,Seg,Tabs,RadioCard,Check,Chip,Badge,Avatar,Count,Skeleton,EmptyState,ErrorCard}.tsx`
- **new:** `components/AppProviders.tsx` (ToastProvider), `lib/format.ts`, `lib/time.ts`, `tests/format.test.ts`
- **new:** `tests/e2e/shots.mjs`
- **modify:** `app/layout.tsx`, `components/AuthCard.tsx`, `components/clerk-appearance.ts`, `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`, `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`, `tests/e2e/clerk-mock/client.tsx`, `package.json`
- **delete:** `app/globals.css`

**Do:**
- Port the CSS and fonts as described in 2.1 and 2.2.
- Build the UI primitives from 2.7.
- `lib/time.ts`: `TZ='Asia/Hebron'`, `toMin`, `hhmm`, `nowInTz()`, `dayStart(date)`, `weekdayOf(date)` (Sat = 0), `atMinutes(dateStr, min) → Date`.
- `lib/format.ts`: the helpers in 2.5.
- Install `date-fns` and `@date-fns/tz` (pin exact versions).
- Auth copy:
  - sign-in title «أهلاً بعودتك», sub «سجّل الدخول لمتابعة إدارة نشاطك.»;
  - sign-up title «أنشئ حسابك في هُدهُد», sub «جهّز هُدهُد ليرد على عملائك عبر واتساب.»;
  - footer «الحسابات محمية عبر Clerk».
- Root not-found and error pages: MSA, styled with `.card.empty`.
- The `clerk-appearance` variables use the v2 tokens (`colorPrimary #0B7F58`, the font var, radius 12px).
- The Clerk mock (`client.tsx`): `useUser()` returns `firstName: 'سامي', lastName: 'ناصر', fullName`, `primaryEmailAddress.emailAddress: 'owner@example.com'`. `UserButton` renders a 40px avatar button.
- `tests/e2e/shots.mjs` (`node tests/e2e/shots.mjs /dashboard /dashboard/orders …`):
  - uses the mock-auth cookie (`E2E_USER`);
  - for each path and each width in `[390, 768, 1440]` (height 900, or 844 for 390), saves `screenshots/<slug>-<w>.png`;
  - prints horizontal overflow and tap targets under 40px (below 1024px). Reuse the `audit()` code from `walkthrough.mjs` with the threshold changed to 40.

**Accept:**
- `/sign-in` and `/sign-up` render with Plex/Tajawal, RTL, v2 colours, with no layout overflow at 390.
- No Google Fonts `<link>` in the HTML.
- The old dashboard pages may look unstyled at this point. That is expected: they are replaced in P4.

**Verify:** the standard commands, plus `node tests/e2e/shots.mjs /sign-in /sign-up` with the dev server running (`HUDHUD_E2E_AUTH=1 npx next dev -p 3100`).

### P2: Schema v2 + migrations + validation (removes payment)

**Files:**
- `lib/db/schema.ts`
- `drizzle/0001_v2_add.sql`, `drizzle/0002_v2_data.sql`, `drizzle/0003_v2_drop.sql` + `drizzle/meta/*` (generated)
- `lib/constants.ts` (rewrite), `lib/types.ts` (rewrite)
- `lib/validation/` (new folder: `common.ts`, `business.ts`, `catalog.ts`, `orders.ts`, `bookings.ts`, `faq.ts`, `ai.ts`, `account.ts`, `onboarding.ts`)
- keep `lib/validation.ts` with only `clean` and `validateOrder` (the landing order API); re-export from `lib/validation/common.ts` if convenient
- `lib/availability.ts` (pure), `lib/orders.ts` (pure totals)
- `tests/availability.test.ts`, `tests/orders.test.ts`, `tests/validation.test.ts` (update)
- delete `lib/slots.ts`, `lib/readiness.ts`, `lib/defaults.ts`, `tests/slots.test.ts`

**Do:**
- Implement 3.2 and 3.3 with the 3.1 mechanics.
- Temporarily delete the old dashboard pages, components and API routes that no longer compile (everything listed as Replace/Remove/Delete in 1.2, 1.3 and 1.7). This keeps typecheck green. Put minimal placeholders in their place: `app/dashboard/page.tsx` returning `<main class="page"><h1>الرئيسية</h1></main>`, and `/onboarding` returning «قيد التجهيز». P4 and P5 replace them.
- `lib/constants.ts` contents:
  - `BUSINESS_TYPES` (from `TYPES` in Onboarding + the Business-page label + plural label for FAQ suggestions: salon «صالونات التجميل», food «المطاعم والمخابز», clothes «متاجر الملابس», clinic «العيادات», tech «متاجر الإلكترونيات», other «الأنشطة المشابهة»);
  - `CITIES`, `DEFAULT_ZONES` (from Onboarding);
  - `ETA_OPTIONS`;
  - `DURATIONS = [30,45,60,90,120,150,240]`;
  - `BUFFERS = [0,10,15,30]`;
  - `LEAD_OPTIONS = [0,60,120,1440]`;
  - `HORIZON_OPTIONS = [7,30,90]`;
  - `FAQ_CATEGORIES`;
  - `ORDER_FLOW`, `ORDER_STATUS` (labels + badge classes from `ST`), `NEXT_LABEL`, `NEXT_EVENT`, `CANCEL_REASONS`, `BOOKING_STATUS`;
  - `PLAN = {name:'الباقة الأساسية', priceMinor:14900, conversations:1000, members:5, items:100}`;
  - `FAQ_SUGGESTIONS` (below);
  - `AI_DEFAULTS`.

  **No** `PAYMENT_*` and **no** currency list.
- `FAQ_SUGGESTIONS` by type (MSA; key = `${type}.${i}`):
  - salon: the four `SUGG` items in `FAQ.dc.html` + «هل يمكنني إلغاء الموعد أو تأجيله؟»
  - food: «هل يوجد توصيل؟ وإلى أين؟»، «كم يستغرق تجهيز الطلب؟»، «هل توجد أطباق نباتية أو خالية من الغلوتين؟»، «هل تستقبلون حجوزات للطاولات؟»، «هل يوجد حد أدنى للطلب؟»
  - clothes: «ما سياسة الإرجاع والاستبدال؟»، «كيف أعرف المقاس المناسب؟»، «هل يوجد توصيل؟ وكم رسومه؟»، «كم تستغرق مدة التوصيل؟»، «هل تتوفر مقاسات كبيرة؟»
  - clinic: «كم سعر الكشفية؟»، «هل تقبلون التأمين الصحي؟ وأي شركات؟»، «كيف ألغي موعدي أو أؤجله؟»، «كم دقيقة يجب أن أصل قبل الموعد؟»، «هل تستقبلون الحالات الطارئة؟»
  - tech: «هل الأجهزة أصلية وعليها كفالة؟»، «كم مدة الكفالة؟»، «هل تقدّمون خدمة صيانة؟ وكم تستغرق؟»، «هل يوجد توصيل؟»، «هل تقبلون استبدال الأجهزة القديمة؟»
  - other: «ما الخدمات التي تقدّمونها؟»، «كم الأسعار تقريباً؟»، «كيف يمكنني الطلب أو الحجز؟»، «ما سياسة الإلغاء؟»، «أين يقع مكانكم؟»
- `lib/availability.ts`: a pure function

  ```ts
  slotsFor({ hours, closures, leaves, bookings, memberId, durationMin, bufferMin, date, now, leadMinutes, horizonDays, serviceDays, stepMin = 30 }) → { startMin, reason }[]
  ```

  Rules (port `busy()` from `Bookings.dc.html`, then extend), applied in this order:
  1. day closed, or weekday not in the service's days → «مغلق»;
  2. date in closures → «عطلة»;
  3. member on leave → «غياب»;
  4. beyond the horizon → «خارج مدة الحجز المسموحة»;
  5. outside open/close → «خارج أوقات العمل»;
  6. overlaps the break → «استراحة»;
  7. `start <= now + lead` → «انقضى الوقت»;
  8. overlaps a pending/confirmed booking of that member within `[start, start+dur+buffer)` vs `[b.start, b.blocked_until)` → «محجوز».

  Candidate starts run from open to close − duration, every 30 minutes.

  Unit tests cover every rule, plus `excludeId` for reschedule.
- `lib/orders.ts`: `calcTotals(lines, area|null, pickup, freeOverMinor)` → `{subtotal, fee, total, free}`, matching the prototype `calc()`. Fee is 0 when pickup or when the subtotal reaches `freeOver` (and the area fee > 0 → `free = true`). Unit tests.
- Validation (MSA):
  - required → «هذا الحقل مطلوب»;
  - phone → «الرقم غير صحيح، اكتبه مع رمز الدولة»;
  - URL → «يجب أن يبدأ الرابط بـ https://»;
  - price → «اكتب سعراً صحيحاً أكبر من صفر»;
  - plus the page-specific copy from the prototypes («اكتب اسم العميل»، «اكتب العنوان ليصل الطلب»، «اختر موظفاً واحداً على الأقل»، «اكتب الجواب»، «اكتب الرد قبل إرساله»، «اختر التاريخ»…).
  - `lib/server/api.ts`: «يجب تسجيل الدخول أولاً» (401), «لم تُنشئ نشاطك بعد» (404), «حجم الطلب كبير جداً» (413), «البيانات غير صحيحة» (400), «هذه القيمة مستخدمة من قبل» (23505), «هذا الوقت محجوز، اختر وقتاً آخر» (23P01 → 409), «حدث خطأ، أعد المحاولة» (500), «غير موجود» (404 uuid).

**Accept:**
- Migrations apply on an empty DB **and** on a DB with 0000-era data:
  1. before migrating, insert a business with `payment_methods = '{cash}'`, `delivery = {"enabled":true,"areas":"رام الله","feeMinor":1500}`, two availability ranges, and an FAQ `common.payment`;
  2. migrate;
  3. assert: the business has the expected `type`, `offers`, `business_hours` with a break, one `delivery_areas` row, the payment FAQ deleted, the column `payment_methods` gone (`\d businesses`), and the exclusion constraint present.
- `grep -rniE "payment|PAYMENT|طرق الدفع|الدفع" app lib components tests` returns only `validateOrder` code paths, if any. Do not touch the landing form messages.

**Verify:** the standard commands; `npm run db:migrate` twice; the manual SQL checks above (write them as `scripts/check-v2-migration.sql` and run `psql $DATABASE_URL -f`).

### P3: Server data layer

**Files:**
- `lib/server/business.ts`: `findBusiness`, `ensureOwnerMember(business, clerkUser)`, `getSettings(business)`
- `lib/server/loaders/{shell,home,attention,orders,bookings,catalog,business,faq,ai,account,onboarding}.ts`
- `lib/server/dto.ts`: all row → DTO mappers
- `lib/server/stats.ts`: `bumpStat(businessId, field, n=1)` (upsert today in Asia/Hebron); `monthSum(businessId, field)`
- `lib/server/send.ts`: `stubSend(kind, businessId)`, a logger only
- `lib/server/catalog.ts`: soft-delete helpers ported from `lib/server/products.ts`; then delete that file

**Do:**
- `loadShell` returns:
  ```ts
  { business: {id, name, initial, color, type, offers, sections, onboardingDone, onboardingProgress:{done, total:8}},
    owner: {name}, wa: 'on'|'off'|'warn', counts: {attention, newOrders}, aiEnabled, staging: boolean }
  ```
  `onboardingProgress.done` = the number of steps done, using the `stepDone` logic from the Onboarding script.
- `wa` = `warn` when the status is `needs_attention` or `token_expires_at < now + 7 days`.
- `ensureOwnerMember` runs in the dashboard layout. It updates the owner's name and email from `currentUser()` (Clerk) when they differ. Under the e2e mock, `currentUser` comes from the mock: add `currentUser()` to `tests/e2e/clerk-mock/server.ts` returning the same fake user.
- Every loader takes a `BusinessRow`, runs its queries in `Promise.all`, and returns serialisable DTOs only (ISO strings for dates).

**Accept:** each loader has a small Vitest test against local Postgres in `tests/server/*.test.ts`. Skip them with `describe.skipIf(!process.env.DATABASE_URL)` so CI without a DB stays green. The tests seed one business and assert DTO shapes, including that **no DTO has a payment key**:

```ts
expect(JSON.stringify(dto)).not.toMatch(/pay/i)
```

**Verify:** standard commands, plus `DATABASE_URL=… npm test`.

### P4: Shell + Home + demo seeder (first visible milestone)

**Files:**
- `app/dashboard/layout.tsx`, `components/shell/{Shell,Sidebar,MobileBar,MobileDrawer,StagingBar,nav}.tsx`
- `app/dashboard/{page,HomeClient,loading,error}.tsx`, `components/home/*`
- `app/api/app/ai/{pause,resume}/route.ts`
- `app/api/app/dev/seed/route.ts`, `lib/server/demo-seed.ts`
- placeholders for the not-yet-built routes (`attention`, `orders`, `bookings`, `catalog`, `business`, `faq`, `ai`, `account`): `page.tsx` with the page head (h1 + subtitle copy from the prototype) and `<EmptyState title="قيد التجهيز" />`
- `next.config.mjs`: add `redirects()` for `/dashboard/products`→`/dashboard/catalog`, `/dashboard/booking`→`/dashboard/bookings`, `/dashboard/info`→`/dashboard/business` (permanent: false)

**Do:**
- **Shell:** exactly as in 2.3. Port the markup from `Sidebar.dc.html` (both the desktop and the mobile drawer copies). The mobile bar's attention link shows the count and the aria-label `طلبات تحتاج تدخلك: ${n}`.
- **Home:** port `Main.dc.html`.
  - Greeting: «صباح الخير، {firstName}» before 12:00 Asia/Hebron, else «مساء الخير، {firstName}».
  - Subtitle: «{dateTitle(today)} · إليك ملخص عملك اليوم.»
  - Header button «تحتاج تدخلك» → `/dashboard/attention`.
  - Banner priority:
    1. `!onboardingDone` → **stNew**, with the progress bar `done/8`, the text «بقيت {8-done} خطوات قصيرة: اربط واتساب، وأضف منتجاتك، وجرّب محادثة. يمكنك التوقف والعودة في أي وقت.», and «أكمل الإعداد» → `/onboarding`;
    2. WA `off` → **stWaOff**, «انقطع اتصال واتساب منذ الساعة {clock(disconnected_at)}.» + «أعد ربط واتساب» → `/dashboard/account`;
    3. `!aiEnabled` → **stPaused** («أعد تشغيله» → `POST ai/resume`, toast «عاد هُدهُد إلى العمل»);
    4. else **stOn**: «واتساب متصل على {phone} · آخر رد {agoText(last_reply_at)}» (omit the second part when null). «إيقاف مؤقت» opens the pause dialog → `POST ai/pause {duration:'manual'}`, toast «تم إيقاف هُدهُد مؤقتاً».
  - **Stats:** the four cards; definitions are in the table below.
  - **Lists:**
    - attention: the 3 oldest open items (name, phone, reason, «ينتظر منذ {waitText}», «ردّ» → `/dashboard/attention#a-{id}`);
    - orders: the 5 most recent, table + mobile list, draft badge;
    - upcoming bookings: today's remaining non-cancelled (up to 5);
    - activity: 5 rows from today's stats, value «{n} ثوانٍ» for the average;
    - the privacy note, verbatim.

    Each list keeps its prototype empty state. Respect `sections` (hide the orders card when orders are off, the bookings card when bookings are off).
- **Demo seeder** (`NEXT_PUBLIC_HUDHUD_STAGING=1` only), POST:
  - inserts realistic Palestinian sample data, adapted from the prototype SEEDs, into the **signed-in** business:
    - 2 staff members (سارة، ليان, `pending`, `provides_services`);
    - 7 products and 7 services from `Catalog.dc.html` (prices ×100);
    - hours Sat–Thu 09:00–19:00, break 13:00–14:00;
    - 6 delivery areas from `Business.dc.html` + free-over 200 ₪;
    - 8 FAQs from `FAQ.dc.html` (map the categories);
    - 8 orders across all statuses with items and events (the dates relative to now as in `SEED.day`);
    - ~15 bookings around today and tomorrow (from `Bookings.dc.html` SEED, shifted to the current week);
    - 3 attention items (reason, ref, suggestion from `Attention.dc.html`; **no `summary`**);
    - `daily_stats` for today (conversations 47, auto_replied 44, orders_logged 4, bookings_confirmed 5, handed_off 3, resolved 5, replies 44, reply_ms_total 264000);
    - a stub WhatsApp connection (connected, the business phone, `last_reply_at` = now − 2 min).
  - Every seeded row is tagged so DELETE can remove only seeded rows:
    - every seeded row gets `demo = true` (the column comes from P2, see 3.2);
    - DELETE removes `demo = true` rows and the stub connection when `is_stub`, and zeroes today's stats.
  - Idempotent: POST first runs the DELETE logic.

**Home stats:**

| Card | Value | Note | Link |
| --- | --- | --- | --- |
| محادثات اليوم | `daily_stats.conversations` (today) | «ردّ هُدهُد على {auto_replied} منها تلقائياً» (new account: «بعد ربط واتساب») | `/dashboard/ai` |
| تحتاج تدخلك | Open attention count | «أقدمها منذ {waitText}» or «لا شيء» | `/dashboard/attention` |
| طلبات جديدة | Count of status `new` | «قيمتها {formatMoney(sum total)}» or «—» | `/dashboard/orders` |
| حجوزات اليوم | Today's non-cancelled bookings | «التالي {clock} · {name}» or «—» | `/dashboard/bookings` |

**Accept:**
- At 1440 the sidebar is on the right; at 768 and 390 there is a top bar + drawer.
- The nav highlights the active page.
- Counts appear after seeding.
- The pause → paused banner → resume cycle persists across reload.
- The new-account banner shows for a business without `onboarded_at`.
- No horizontal overflow at 390.

**Verify:**
- `HUDHUD_E2E_AUTH=1 NEXT_PUBLIC_HUDHUD_STAGING=1 npx next dev -p 3100`;
- create a business row for the mock user with `psql` (or run P5 first locally);
- POST the seed;
- `node tests/e2e/shots.mjs /dashboard`; compare with `Main.dc.html` in the artifact.

### P5: Onboarding (8 steps, save and resume)

**Files:**
- `app/onboarding/{page,OnboardingClient,loading,error}.tsx`, `components/onboarding/*`
- `app/api/app/onboarding/step/[n]/route.ts`, `app/api/app/onboarding/activate/route.ts`
- `app/api/app/whatsapp/connect/{start,verify}/route.ts`
- `lib/client/test-chat.ts`, `lib/onboarding.ts` (pure: `stepDone`, `doneCount`, `visibleSteps`, `generatedFaqs(type, data)`)

**Do:** port `Onboarding.dc.html` exactly: `ob-top`, `ob-steps` (the side list, with locked future steps), `ob-main`, the mobile `ob-prog`, and `ob-foot`.
- `page.tsx` logic:
  - no business → wizard at step 1;
  - business with `onboarded_at` → `redirect('/dashboard')`;
  - business without `onboarded_at` and `maxStep > 1` → the **resume card** («أهلاً بعودتك يا {firstName}», «أكملت {done} من 8 خطوات…», «تابع: {current step title}»).
- Every «التالي» saves the current step through `PUT onboarding/step/[n]` (button spinner; stays put and shows a toast on error), then moves on. «تخطَّ الآن» / «سأربطه لاحقاً» → PUT with `{skipped:true}`.
- «احفظ وأكمل لاحقاً» saves the current step without validation, shows the toast «حُفظ تقدّمك. يمكنك المتابعة في أي وقت», then `router.push('/dashboard')`. Home then shows the stNew banner.
- Step specifics:
  - **Step 1:** type cards + offers checkboxes.
  - **Step 2:** name and phone are required (prototype errors).
  - **Step 3:** quick presets + per-day switches and times. Saved into `business_hours` with no break.
  - **Step 4:** rows filtered by offers; «+ خدمة»/«+ منتج»; the «استيراد من ملف» link → toast «رفع الملفات متاح من صفحة المنتجات والخدمات».
  - **Step 5:** shows the «لا تحتاج إلى هذه الخطوة» card when delivery is not in offers.
  - **Step 6:** `generatedFaqs` produces:
    - the hours answer from step 3 data (e.g. «نستقبلكم من السبت إلى الخميس، من 9 صباحاً حتى 7 مساءً. يوم الجمعة عطلة.»; build the sentence from the day ranges);
    - the location answer from city + address («في {city}، {address}.»);
    - the first two `FAQ_SUGGESTIONS[type]` with empty answers, unchecked.

    Checked rows require an answer (inline «اكتب الجواب»).
  - **Step 7:** stub flow idle → busy (1.1 s) → pick → code → done, with the prototype copy and errors («الرمز مكوّن من 6 أرقام», «الرمز غير صحيح. تحقّق منه أو اطلب رمزاً جديداً»).
  - **Step 8:** summary with fix links + test chat (client-only, `lib/client/test-chat.ts` port of `answer()`); «فعّل هُدهُد» → activate. Without WA it shows the warning and «اربط واتساب الآن».
- Live screen: «هُدهُد يعمل الآن!» with the real phone.

**Accept:**
- Full happy path with the mock user (new) → dashboard.
- Abandon at step 4 → reload `/onboarding` → resume card at step 4 with all data intact.
- The Home banner shows «4 من 8»-style progress.
- Skipped steps show the «تخطّيتها، يمكنك العودة إليها» note.
- A business with type `clinic` hides products rows and the delivery step.

**Verify:** standard commands; screenshots of steps 1, 2, 4, 7 and 8, resume and live at 3 widths.

### ▶ Staging deploy #1 (after P5): see section 6. Smoke-test shell, home, onboarding and seed.

### P6: تحتاج تدخلك

**Files:** `app/dashboard/attention/{page,AttentionClient,loading,error}.tsx`, `app/api/app/attention/[id]/{reply/route.ts,route.ts}`.

**Do:** port `Attention.dc.html`.
- `<main style={{maxWidth:980}} data-clarity-mask="true">`.
- The privacy strip, verbatim.
- Tabs «مفتوحة» (open + replied count) and «تم حلها اليوم» (`daily_stats.resolved` today; that tab shows only the count card).
- Card per item:
  - avatar, name, phone as a `tel:` link, reason;
  - the «ينتظر منذ» badge;
  - the ref badge → `/dashboard/orders?id=…` or `/dashboard/bookings?id=…`;
  - «هُدهُد متوقف مع هذا العميل» when `hodhod_paused`.
- Composer:
  - the Seg write/instruct;
  - a textarea or input with the prototype labels;
  - the suggestion chip (only when `suggestion` exists);
  - the «دع هُدهُد يتابع مع العميل بعد ردّي» checkbox (default on);
  - a send button with a spinner;
  - the sent toasts from the script (use «معه» for every customer).
- After sending, clear the text from React state immediately.
- Resolve dialog → DELETE → toast «تم الحل وحُذفت التفاصيل» → `router.refresh()`.
- The `#a-{id}` hash scrolls to and highlights the card.

**Accept:**
- Reply (both modes, empty → inline error) → «تم إرسال الرد».
- Resolve removes the item, increments the done count and decrements the sidebar count.
- DB check: `attention_items` has no reply text column, and the server log line contains no reply text.

**Verify:** standard + screenshots (list, composer open, empty, resolve dialog).

### P7: المنتجات والخدمات

**Files:** `app/dashboard/catalog/*`, `components/catalog/{ItemDrawer,ImageField,ProductCard,ServiceRow}.tsx`, `app/api/app/catalog/**`.

**Do:** port `Catalog.dc.html`.
- `?tab=services` selects the tab. Tabs show only the kinds that are visible per `sections.products`/`sections.services`.
- Products grid:
  - the thumb is the photo via `next/image` from `/media/...`, or the coloured `thumb t{n}` placeholder with a generic bag icon;
  - variants as badges;
  - the stock badge (`stockCls` logic);
  - the visibility switch (PATCH `{active}` + the prototype toast);
  - «تعديل».
- Services list: duration, price, staff avatars, days text («كل أيام الدوام» when ≥6).
- Drawer:
  - image drop zone (busy state + size badge; reuse the resize and upload from the old PhotoPicker / `lib/client/image.ts`, `upload.ts`);
  - name*, description, price* (₪);
  - service: the duration select;
  - product: variants (+ «أضف حجم أو نوع») and stock radio-cards with the qty field;
  - service: staff checks (bookable members) with «اختر موظفاً واحداً على الأقل», and day chips;
  - the «ظاهر للعملاء» switch.

  Foot buttons: «أضف»/«احفظ التعديلات», «إلغاء», «احذف».
- Delete dialog → soft delete → toast «تم حذف «{name}»» + «تراجع» → restore.
- Filters and search as in the script.
- The empty state's «لا تبيع منتجات؟ أخفِ هذا القسم» → `/dashboard/account?tab=sections`.

**Accept:** create, edit and delete with undo for both kinds; validation errors; stock filter correctness; photo upload works locally (Blob token needed → if unavailable locally, verify on staging).

**Verify:** standard + screenshots (products, services, drawer product, drawer service, empty, delete dialog).

### P8: معلومات نشاطك

**Files:** `app/dashboard/business/*`, `app/api/app/business/route.ts`, `app/api/app/business/rules/route.ts`, `app/api/app/delivery/route.ts`, `lib/completeness.ts` (+ test).

**Do:** port `Business.dc.html`.
- Completeness = the 7 checks in the script (name, description, address, map link, phone, returns or cancel policy, delivery areas or delivery off). Show «ينقص: …».
- Four section cards (basic/location/contact/policy) with view and edit modes, the per-field errors from `errOf`, and «آخر تحديث: {agoText}» / «لم تُضف بعد».
  - The basic section's type select uses the 6 business-type labels.
  - Changing the type does **not** delete FAQs. It only changes which suggestions appear.
- Hours card: read-only from `business_hours` (format «9:00 ص – 7:00 م» or «مغلق»), with «تعديل» → `/dashboard/bookings?tab=settings`.
- Delivery card:
  - the switch saves immediately with the toast;
  - the areas table (`.tbl.stack`) is edited locally, with the dirty foot «إلغاء / حفظ» → `PUT delivery`;
  - free-over input;
  - error toast «اكتب اسم كل منطقة قبل الحفظ».

  Hidden when `sections.delivery` is false.
- Rules card: add/remove → `PUT business/rules`, toast «تمت إضافة القاعدة».
- **No payment UI anywhere.**

**Accept:** edit and save each section, refresh, values persist with updated «آخر تحديث»; the completeness count updates; delivery edits persist.

**Verify:** standard + screenshots (full, editing a section, delivery off).

### P9: الحجوزات, settings tab (أوقات العمل والتوفّر)

**Files:** `app/dashboard/bookings/{page,BookingsClient,loading,error}.tsx`, `components/bookings/AvailabilitySettings.tsx`, `components/bookings/LeaveDialog.tsx`, `app/api/app/availability/route.ts`, `app/api/app/leaves/**`.

**Do:** port the `isSet` half of `Bookings.dc.html`.
- Day rows: switch + open/close + break inputs; error «يجب أن يكون وقت الإغلاق بعد وقت الفتح».
- Services duration and buffer table (services only, with the «من يقدّمها» names).
- Holidays list + add (date required «اختر التاريخ»).
- Staff leaves list + «إضافة غياب» → `LeaveDialog`. The design only stubs this, so build the minimal dialog:
  - member select (bookable members), «من» date, «إلى» date, «السبب (اختياري)»;
  - buttons «حفظ» / «إلغاء»;
  - saves immediately (POST) and the list shows «إجازة من {d1} إلى {d2} {month}».
- Booking rules (lead, horizon, auto/manual radio-cards).
- All edits except leaves mark the page dirty → the warning bar «لديك تغييرات غير محفوظة…» with «تجاهل» / «حفظ» → `PUT availability` → toast «تم حفظ أوقات العمل، ويستخدمها هُدهُد الآن».
- `beforeunload` guard while dirty.

**Accept:** changes persist; discard restores the server values; Business page hours reflect the saved hours.

**Verify:** standard + screenshots (settings at 3 widths, dirty bar).

### P10: الحجوزات, calendar, drawer, reschedule and conflict check

**Files:**
- `components/bookings/{Calendar,DayGrid,DayAgenda,WeekView,ListView,BookingDrawer,SlotPicker}.tsx`
- `app/api/app/bookings/route.ts`, `app/api/app/bookings/[id]/route.ts`, `app/api/app/bookings/[id]/status/route.ts`, `app/api/app/bookings/slots/route.ts`
- `lib/server/bookings.ts` (create/reschedule in a transaction: compute slots server-side, reject with 409 if `reason` is non-empty, then insert/update; also catch 23P01)

**Do:** port the `isCal` half.
- Toolbar: prev/next day (unbounded), «اليوم», title (`dateTitle` + « · اليوم»), Seg day/week/list, staff filter («كل الموظفين» + bookable members), and the colour legend.
- **Day grid** (desktop/tablet, `.hide-m`):
  - columns = filtered members;
  - `OPEN0` = that day's `open_min` rounded down to the hour, end = `close_min` rounded up;
  - `SCALE = 1.2` px/min;
  - break and «مغلق» blocks;
  - the now line (today only);
  - event buttons with the prototype classes (`evt {status} short sel`) and the aria-label.
- **Phone agenda** (`.only-m`).
- **Week:** Saturday–Friday containing the selected day, closed days marked.
- **List:** the next 7 days grouped, non-cancelled and not ended.
- Fetch more with `GET bookings?from&to` when navigating outside the loaded range. The initial load = the current week ± 7 days.
- **Drawer:**
  - view mode: status + source badges, customer card with wa.me, kv list, pending alert;
  - buttons «أكّد الحجز» / «تم الموعد» / «تغيير الموعد» / «إلغاء» per the script's `isPending`/`canComplete`/`active`/`inactive`.
- **Pick mode** (reschedule or «حجز جديد»):
  - name*/phone*/service select (new only);
  - day chips for the next 7 days from today within the horizon (closed days disabled);
  - slots from `GET bookings/slots` (disabled ones carry `title={reason}` and the aria «{time}، {reason}»);
  - the success summary «{staff} متاح يوم {day} من {t1} إلى {t2}، ولا يوجد تعارض مع حجوزات أخرى.»;
  - «اختر وقتاً أولاً».
  - On commit, a server 409 → toast with the server message, re-fetch the slots, clear the selection.
- Cancel dialog (MSA neutral copy: «سنرسل للعميل رسالة بإلغاء الموعد، ويصبح الوقت متاحاً ليحجزه هُدهُد.»).
- `?id=` opens that booking's drawer (links from Attention and Home).

**Accept:**
- Create a booking → its slot becomes «محجوز» for the same member.
- Two concurrent POSTs for the same slot → exactly one succeeds. Add a Vitest test against the DB that fires both with `Promise.all`.
- Reschedule excludes its own booking.
- Status transitions are enforced server-side.
- The empty-state CTAs work.

**Verify:** standard + screenshots (day at 1440 and 768, agenda at 390, week, list, drawer view, pick mode with disabled slots).

### P11: الطلبات

**Files:** `app/dashboard/orders/*`, `components/orders/{OrdersTable,OrderCards,OrderDrawer,CancelDialog}.tsx`, `app/api/app/orders/**`, `lib/server/orders.ts`.

**Do:** port `Orders.dc.html`, minus every payment remnant.
- Tabs «الكل» + 6 statuses with counts (`count warm` on new).
- Search by number, name or phone.
- Range select (all / today / last 7 days).
- Table: number + source («من هُدهُد» with the logo / «يدوي»), customer + phone, date (`relDay`), items text, total + fee text («توصيل مجاني» / «شامل التوصيل {fee} ₪» / «استلام من المحل»), status + draft badge.
- Cards under 768.
- **Drawer:**
  - header: number, status, draft badge, meta;
  - delivered/cancelled/draft alerts;
  - customer card or edit fields;
  - items (qty Seg −/+, remove, add select listing active products and each variant «{name} · {variant} · {price} ₪»);
  - totals `dl`;
  - **«التوصيل»** section (area, address, notes; edit: area select = delivery areas + «استلام من المحل · مجاناً»; address required unless pickup);
  - timeline (`order_events`, icon classes from `TL_IC`, «{actor} · {relDay}»).
- Foot: «تعديل الطلب» / save / cancel; the advance button `NEXT_LABEL`; «إلغاء الطلب» → the cancel dialog (reasons from the script).
- Totals are always recomputed **server-side** from catalog prices. The client total is display-only.
- «طلب جديد» opens the drawer in new + edit mode.
- `?id=` opens an order.
- Toasts from the script.

**Accept:**
- Create an order with 2 lines and an area → the number increments.
- The free-over rule applies.
- Edit qty → totals update.
- Advance through to delivered; cancel with a reason.
- An unknown key in the body (`paymentMethod`) → 400.
- `grep -i pay` on the Orders client code → nothing.

**Verify:** standard + screenshots (list 1440, cards 390, drawer view/edit/new, cancel dialog, empty, no-match).

### P12: الأسئلة الشائعة

**Files:** `app/dashboard/faq/*`, `components/faq/{FaqDrawer,FaqItem}.tsx`, `app/api/app/faqs/**`.

**Do:** port `FAQ.dc.html`.
- Suggestions card: «أسئلة يطرحها عادةً عملاء {plural type label}». It lists `FAQ_SUGGESTIONS[type]` minus the dismissed ones and minus questions that already exist. Actions: «أضف جواباً» (opens the drawer prefilled, `templateKey` set) and «تجاهل» (dismiss API).
- Search + category chips with counts.
- Summary line «{n} أسئلة · {m} مفعّلة · استخدمها هُدهُد {sum} مرة هذا الشهر».
- Item meta «استُخدم {n} مرة هذا الشهر · آخر تحديث: {agoText}» / «لم يُستخدم هذا الشهر · …».
- Toggle, edit, delete dialog + undo.
- Drawer:
  - question*, answer* with the length counter (`len/500`, error over 500);
  - category select;
  - alternative phrasings (chips + add);
  - enabled switch;
  - the preview chat (client only).
- The privacy footnote, verbatim.

**Accept:** add from a suggestion (it disappears from suggestions), dismiss persists, edit with alts, 500-character limit, delete + undo.

**Verify:** standard + screenshots (list, empty new account, drawer).

### P13: إعدادات هُدهُد

**Files:** `app/dashboard/ai/*`, `components/ai/{PauseDialog,TestChat}.tsx`, `app/api/app/ai/route.ts`.

**Do:** port `AISettings.dc.html`.
- Hero with the master switch:
  - on → the pause dialog with the duration radio-cards → `POST ai/pause`;
  - off → `POST ai/resume`.
  - The paused text uses `paused_until`: «لمدة ساعة (حتى {clock})» / «حتى صباح الغد (9:00 ص)» / «حتى تعيد تشغيلها».
- Mode, language, tone chips + hint, name (+ the hint preview «معك {name} من {business name}»), emoji switch.
- Permissions with the off-warnings.
- Handoff rules:
  - `human` locked;
  - `big` with a ₪ number;
  - `group` with a number.
- Notify checks:
  - `dash` locked;
  - wa label «رسالة واتساب إلى {business phone}»;
  - email label «بريد إلكتروني إلى {Clerk email}».
- Unknown-answer radio-cards + custom message (required when custom).
- Dirty bar (save → `PUT ai`; discard), `beforeunload` guard.
- Test chat: the port of `reply()` in `lib/client/test-chat.ts`, using the **current unsaved** config and real business hours, phone and name where the prototype hard-codes them. Presets as in the prototype. «ابدأ من جديد». Never persisted.

**Accept:** save, reload, persisted; discard; pausing from here reflects on Home and vice versa; the test chat makes no network request (check the Playwright request log).

**Verify:** standard + screenshots (normal, paused, dirty, pause dialog).

### P14: إعدادات الحساب

**Files:** `app/dashboard/account/*` (delete the old `[[...rest]]` route), `components/account/*`, `app/api/app/account/route.ts`, `app/api/app/team/**`, `app/api/app/whatsapp/{renew,disconnect}/route.ts`.

**Do:** port `Account.dc.html`.
- Tabs واتساب / فريق العمل / الاشتراك / أقسام اللوحة via `?tab=wa|team|plan|sections`. The «!» dot on the WhatsApp tab shows when the status is not `on`.
- **WhatsApp tab:**
  - on: kv list (phone, display name, «واتساب للأعمال · عبر Meta», connected since `D Month YYYY`, quality badge, «رسائل هذا الشهر» from `monthSum(messages)` + «(أعداد فقط، لا تُحفظ النصوص)»);
  - «اختبر الاتصال» links to `/dashboard/ai` (the test chat). The prototype links to Onboarding, but onboarding is already finished at this point;
  - disconnect dialog;
  - warn: renew;
  - off: «اربط رقم واتساب» opens an inline copy of the onboarding step-7 stub component. Reuse `components/onboarding/WhatsAppConnect.tsx`.
  - After-hours radio-cards → PATCH immediately (toast «تم الحفظ»).
- **Team:**
  - member list (owner badge «المالك», role select → PATCH + toast, remove dialog);
  - invite form (name*, phone*, role) → POST → toast «أُرسلت الدعوة عبر واتساب». This is a stub; the staging bar explains it.
  - Count «{n} أعضاء من أصل 5 في باقتك».
- **Plan:**
  - the PLAN constant;
  - the renewal date = the next monthly anniversary of `businesses.created_at`;
  - usage bars: conversations this month / 1000, members / 5, catalog items / 100 (amber when ≥80%);
  - the info note;
  - «اطّلع على الباقات» toast.
- **Sections:** 5 switches → `PATCH account {sections}` + the off-alerts + toasts; the nav updates via `router.refresh()`.

**Accept:** all tabs persist; hiding «الطلبات» removes it from the nav and the Home card; disconnect turns the sidebar pill red and Home shows the WA-off banner; renew clears warn.

**Verify:** standard + screenshots (each tab; WA on/warn/off — force warn with SQL `token_expires_at = now()+interval '3 days'`).

### P15: Ingest endpoint for the future bot (optional this round, but small)

**Files:** `app/api/internal/ingest/route.ts`, `lib/validation/ingest.ts`, `tests/ingest.test.ts`.

**Do:** `POST`, `Authorization: Bearer ${HUDHUD_INGEST_SECRET}`. Returns 404 when the env var is unset; uses a constant-time compare. Body is a discriminated union, each with `businessId`:
- `{type:'stats', day?, inc:{conversations?,…}}`
- `{type:'attention', customerName, customerPhone, reason, refKind?, refId?, suggestion?}`
- `{type:'order', …same as owner create + source:'ai', isDraft?, events?}`
- `{type:'booking', …, source:'ai'}`
- `{type:'faq_used', faqId}`
- `{type:'wa', status?, lastReplyAt?}`

Zod `.strict()` everywhere, so the bot **cannot** send message text fields (there is no field for them). Document the contract in `docs/ingest.md`.

**Accept:** unit tests for auth and schema rejection; a manual curl creates an attention item visible in the UI.

### P16: Cleanup and hardening

**Do:**
- Delete every leftover from 1.7.
- `grep` checks (each must return nothing outside `validateOrder`, `/api/order` and `/admin`):
  - `rg -n "payment|Payment|PAYMENT|طرق الدفع|نقداً عند" app lib components tests`
  - `rg -n "مش |عشان|لسّا|هال|بدك|شو |منيح|كمان مرة" app components lib` (dialect leftovers)
  - `rg -n "_blob/|class=\"rv\"|startView" app components`
- Check that every route has `loading.tsx` and `error.tsx`.
- Check `metadata.title` per page: «{page} · هُدهُد».
- Run Lighthouse-style sanity: no console errors in the e2e run.

**Accept:** clean greps; the standard commands; the full e2e passes (section 5).

### ▶ Staging deploy #2 (final, after P16): section 6, then hand over to the user.

Optional intermediate deploys after P8 and P11 are encouraged. Each deploy follows section 6.

---

## 5. Testing

### 5.1 Unit (Vitest, `npm test`)

- `format`: money, waitText agreement, relDay, durText.
- `availability`: every reason, the lead time, the horizon, `excludeId`.
- `orders`: totals, free-over, pickup.
- `completeness`, `onboarding` (`stepDone`, `generatedFaqs`).
- Validation (strict rejects unknown keys and payment keys).
- `test-chat` (deterministic replies).
- DB-backed tests (`skipIf(!DATABASE_URL)`):
  - loaders;
  - booking double-insert race (exactly one wins);
  - resolve deletes the attention row;
  - the demo seed + unseed leaves zero `demo` rows.

### 5.2 E2E walkthrough (`tests/e2e/walkthrough.mjs`, rewrite)

Same harness as today: mock Clerk via the `e2e_user` cookie, `HUDHUD_E2E_AUTH=1`, local DB. Changes:
- `WIDTHS = [390, 768, 1440]`, plus an overflow-only audit at 360.
- The tap-target threshold is **40px** below 1024px. Keep the existing exemptions.
- Run with `NEXT_PUBLIC_HUDHUD_STAGING=1` so the seeder exists.

Flow (screenshot names in brackets):
1. **Landing, sign-up, sign-in** render [00–02].
2. **Onboarding:**
   - step 1 with no type → «اختر نوع نشاطك للمتابعة» [10];
   - pick «صالون أو مركز تجميل»;
   - step 2 empty → errors; fill name «صالون لمسة», phone `+970 59 123 4567` [11];
   - step 3 preset «السبت–الخميس، 9–7» [12];
   - step 4 add one service «قص وسشوار» 70 ₪ [13];
   - «احفظ وأكمل لاحقاً» → `/dashboard` shows «لنبدأ تشغيل هُدهُد» [14];
   - back to `/onboarding` → resume card «تابع: المنتجات والخدمات» [15];
   - continue: step 5 not applicable (salon has no delivery) → next;
   - step 6 check one FAQ;
   - step 7 stub connect with code `000000` → error, then `123456` → «تم ربط واتساب» [16];
   - step 8 send a test chip [17] → «فعّل هُدهُد» → live [18] → dashboard.
3. **Home:** banner «هُدهُد يعمل ويرد على عملائك» [20]; pause dialog → paused banner → resume.
4. **Seed demo data** via the staging bar button → Home filled [21]; the sidebar shows counts.
5. **Attention:** reply in write mode (empty → error, then a suggestion chip → send) → «تم إرسال الرد»; resolve another → the count drops [30–31].
6. **Orders:**
   - filter «جديد»;
   - search «1042»;
   - open the draft order [40];
   - «طلب جديد» with validation errors [41];
   - fill it, save → «تمت إضافة الطلب #…»;
   - advance once;
   - cancel another with a reason [42].
   - Assert the order drawer has no text matching `/دفع|نقداً|بطاقة|تحويل/`.
7. **Bookings:**
   - day [50], week [51], list [52];
   - open a booking → reschedule → a disabled «محجوز» slot is visible → pick a free slot → saved [53];
   - «حجز جديد» on a taken slot via a direct API double-POST → one 409;
   - settings tab: change Thursday close to 17:00, dirty bar → save [54]; add a holiday; add a leave.
8. **Catalog:**
   - add a product with a variant and qty 3 → «كمية قليلة · 3» [60];
   - add a service with no staff → error, then pick staff → saved;
   - toggle visibility;
   - delete + undo [61].
9. **Business:** edit «العنوان والموقع» with a bad map URL → error → fix → saved [70]; add a delivery area + save; add a rule.
10. **FAQ:** add from a suggestion; dismiss another; toggle off; delete + undo [80–81].
11. **AI settings:** change the tone, dirty bar → save; reload → persisted; test chat preset produces a reply and **no request to `/api/`** during the chat [90].
12. **Account:**
    - WA tab [100];
    - team invite (validation, then success) [101];
    - plan [102];
    - sections: hide «الطلبات» → the nav no longer has it → re-enable [103];
    - disconnect WhatsApp → the Home WA-off banner → renew/reconnect through the stub.
13. **Persistence check** via loaders: fetch each page after reload and assert the edited values.
14. **Isolation:**
    - user B (fresh cookie) is redirected to `/onboarding`;
    - user B gets 404 on user A's order, booking, catalog and attention ids for PATCH/DELETE;
    - anonymous `/api/app/ai` PUT → 401.
15. **Privacy assertions:**
    - after the attention reply, `SELECT` from information_schema: no column named like `%message%|%transcript%|%reply_text%` in any table;
    - `rg` over `screenshots/problems.txt` → no page errors.

Output: `screenshots/*.png` + `screenshots/problems.txt`. The run passes only with **0 problems**.

Command:
```bash
HUDHUD_E2E_AUTH=1 NEXT_PUBLIC_HUDHUD_STAGING=1 DATABASE_URL=… npx next dev -p 3100 &
npm run e2e
```

E2E against staging (real Clerk) is not automated. Use the smoke checklist in 6.4.

---

## 6. Deploy to staging (`hudhud-staging`)

The Vercel MCP connection used while planning could not see this team's projects. Run these steps with the Vercel dashboard or CLI under the account that owns `hudhud-staging`.

### 6.1 Before the first v2 deploy (one time)

1. **Back up the staging DB:** in Neon, create a branch `pre-dashboard-v2` from the staging branch. The v2 migrations drop columns and tables.
2. In Vercel → `hudhud-staging` → Settings, confirm:
   - Git is connected to `qusaibsafa/wakeel`;
   - the production branch is set to the branch staging serves from. If staging serves `feature/dashboard` as its production branch, pushes deploy automatically. If it is a preview deployment of `feature/dashboard`, use the preview URL or alias.
   - Function region is `fra1` (`vercel.json` already sets it);
   - Build command is `npm run vercel-build` (from `vercel.json`);
   - Node is 22.x.
3. **Env vars** for the environment staging builds in (Production and/or Preview for this project):

   | Var | Value |
   | --- | --- |
   | `DATABASE_URL` | Staging Neon (pooled) URL, unchanged |
   | `BLOB_READ_WRITE_TOKEN` | Unchanged (staging Blob store) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Unchanged (staging/dev Clerk instance) |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` | Optional; the props in `layout.tsx` already set them |
   | `NEXT_PUBLIC_CLARITY_ID` | Unset (defaults to `yw1mpfxfq9`) or `yw1mpfxfq9` |
   | `ADMIN_USER`, `ADMIN_PASSWORD` | Unchanged |
   | **`NEXT_PUBLIC_HUDHUD_STAGING`** | **`1`** (new). Must **not** be set in the future production project |
   | **`HUDHUD_INGEST_SECRET`** | New, optional (P15). A random 32+ char value |

   `HUDHUD_E2E_AUTH` must **not** exist on Vercel; `next.config.mjs` also ignores it when `VERCEL` is set.

### 6.2 Each deploy

1. Locally, on `feature/dashboard`: run the standard commands plus `npm run e2e` (0 problems).
2. `git push -u origin feature/dashboard`. Vercel builds and `vercel-build` runs `scripts/migrate.mjs` against the staging DB before `next build`.
3. CLI fallback, if the Git integration is not set up:
   ```bash
   vercel link --project hudhud-staging
   vercel pull --environment=production   # or preview
   vercel deploy                          # or --prod for the staging project's production target
   ```
4. Watch the build log for `[migrate] done`. If the migration fails, the build fails and the previous deployment stays live. Fix and push again. **Never** edit the migration files already applied to staging; add a new one.

### 6.3 Clerk and Clarity checks

- **Clerk:**
  - the staging Clerk instance's allowed origins / domains include the staging URL (needed only for a production-type Clerk instance; development instances accept `*.vercel.app`);
  - redirect URLs: after sign-in `/dashboard`, after sign-up `/onboarding`, after sign-out `/` (set in `ClerkProvider` props);
  - verify that `/dashboard/*`, `/onboarding` and `/api/app/*` are matched by `proxy.ts` and `/` is not (the landing page must not load Clerk JS).
- **Clarity:** in the browser devtools Network tab, `https://www.clarity.ms/tag/yw1mpfxfq9` loads on `/dashboard`. In the console, `clarity('get', …)` is not needed: check that the `environment` tag is `staging` in the Clarity dashboard filter after a few minutes, and that recordings mask the Attention, Orders and Bookings content (names and phones appear as masked blocks).

### 6.4 Smoke test checklist (on the staging URL, real Clerk)

- [ ] `/` landing unchanged; «دخول» → `/sign-in` styled in v2, MSA.
- [ ] Sign up a new test user → `/onboarding` step 1; complete steps 1–2, «احفظ وأكمل لاحقاً» → Home «لنبدأ تشغيل هُدهُد» with progress; return → resume card.
- [ ] Finish onboarding with the stub WA (code `123456`) → «هُدهُد يعمل الآن!» → Home on.
- [ ] Staging bar visible with the stub notice; «أضف بيانات تجريبية» fills every page; sidebar counts 3 / 2-ish.
- [ ] At 390 px (phone): top bar, drawer opens and closes, attention shortcut badge, no horizontal scroll on any page.
- [ ] At 768 px (tablet) and 1440 px (desktop): sidebar right at 1440, top bar at 768.
- [ ] Attention: reply → toast; resolve → removed and «تم حلها اليوم» +1.
- [ ] Orders: create, advance, cancel; **no payment field anywhere**; totals and delivery fee correct.
- [ ] Bookings: reschedule shows taken slots disabled; new booking; settings save; Business page hours match.
- [ ] Catalog: photo upload works (Blob); delete + undo.
- [ ] Business, FAQ, AI settings, Account: edit → reload → persisted.
- [ ] Pause from Home → AI page shows paused; resume from the AI page → Home shows on.
- [ ] Hide «الحجوزات» in Account → nav item gone → restore.
- [ ] Sign out via the sidebar `UserButton` → `/`; `/dashboard` → redirected to `/sign-in`.
- [ ] Vercel → Logs: no 5xx during the smoke run; no log line contains reply text (search the logs for a unique word you typed in a reply).
- [ ] Clarity tag loads (6.3).
- [ ] «امسح البيانات التجريبية» cleans up.

Then send the user the staging URL and the list of stubs (2.9) for review. The user merges to production; this plan does not.

---

## 7. Risks and open questions

**Risks:**
1. **Destructive migration on the staging DB.** Old columns and tables are dropped. Mitigated by the Neon branch backup (6.1) and the migration test in P2.
2. **Gap between the design and the bot contract.** No WhatsApp bot exists yet, so attention, stats, AI orders and bookings come only from the demo seeder or the ingest endpoint. The ingest contract (P15) is a proposal; the bot team may need changes.
3. **Time zone edge cases** around DST in Asia/Hebron for slots. Mitigated by doing all slot math in minutes-of-day on a `TZDate`, with unit tests around the DST change dates.
4. **`btree_gist` on Neon.** It is supported, but if the extension cannot be created, fall back to an app-level `SELECT … FOR UPDATE` on the member's bookings inside the transaction. P10 keeps the app-level check anyway.

**Open questions for the user** (the plan proceeds with the stated default unless you answer otherwise):
- **Q1. Staff for bookings.** The design shows staff (سارة، ليان) in Bookings and Catalog, but no page to manage them. **Default:** bookable staff = team members from Account › فريق العمل (invited members can be assigned before they accept); the owner is used only when there is nobody else. OK, or do you want a «يقدّم خدمات للعملاء» toggle per member?
- **Q2. Customer name in «تحتاج تدخلك».** The README says "reason + phone + reply only", but the design also shows the customer's WhatsApp name (and the ref to an order or booking). **Default:** show the name and the ref, as designed. Confirm, or hide the name?
- **Q3. Existing staging businesses of the old type «متجر» (`shop`).** There is no direct v2 equivalent (clothes vs electronics). **Default:** map them to «نشاط آخر» (`other`). Fine?
- **Q4. Gendered sample copy.** The default is MSA generic masculine («الموظف»، «مالك الحساب»، «العميل») instead of the salon's feminine forms. Confirm.
