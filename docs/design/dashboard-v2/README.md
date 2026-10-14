# Hodhod dashboard: design v2

Source of truth for the business dashboard UI. Live, interactive version: https://claude.ai/artifact/3V8tRdiLRcDbNeAxWM4Fur

The `.dc.html` files are interactive prototypes. Each page has markup in `<x-dc>` with `{{holes}}`, `<sc-if>` and `<sc-for>`, plus the page logic in a `class Component` script at the bottom. Read the script to see the states, validation rules and copy. `hodhod.css` holds the design tokens and every shared component class. The `.rv` dark bar at the top of each page is a prototype-only state switcher and must not ship.

## Pages

| File | Page | Notes |
| --- | --- | --- |
| Sidebar.dc.html | Shell: right sidebar, mobile top bar + drawer | Nav items, WhatsApp status pill (on / off / warn), business card |
| Main.dc.html | الرئيسية | Status banner + pause dialog, stats, «تحتاج تدخلك» list, recent orders, upcoming bookings, today's activity (numbers only) |
| Attention.dc.html | تحتاج تدخلك | Reason + customer phone + reply (write it yourself / instruct Hodhod), wa.me link, mark resolved |
| Orders.dc.html | الطلبات | Status tabs, search, table/cards, order drawer with editable items, totals, status flow, cancel with reason, new order |
| Bookings.dc.html | الحجوزات | Day grid per staff member, week view, list view, booking drawer, reschedule with conflict check, availability settings |
| Catalog.dc.html | المنتجات والخدمات | Products/services tabs, cards, editor drawer (variants, stock, staff, days, visibility), delete with undo |
| Business.dc.html | معلومات نشاطك | Completeness, editable sections, hours (from Bookings), delivery areas, extra rules |
| FAQ.dc.html | الأسئلة الشائعة | Suggestions by business type, search, category filter, enable toggle, editor with alternative phrasings and preview |
| AISettings.dc.html | إعدادات هُدهُد | Auto-reply master switch with pause duration, mode, language/tone, permissions, handoff rules, unknown-answer behaviour, test chat (not saved) |
| Account.dc.html | إعدادات الحساب | WhatsApp connected / needs attention / disconnected, team + invites, plan usage, show/hide sections |
| Onboarding.dc.html | إعداد الحساب | 8-step wizard, steps adapt to business type, save and resume later, WhatsApp connect flow, test + activate |

## Product rules (from the owner, non-negotiable)

1. **No conversations are stored or shown.** There is no inbox or transcripts, and no message content anywhere. Only counts and numbers. «تحتاج تدخلك» shows the reason, the customer's phone number and a reply option, nothing else from the chat.
2. **No payment method / payment type** anywhere in this version (orders, business info, settings).
3. **All UI copy is Modern Standard Arabic (فصحى)**, RTL. Copy in the prototypes is final unless it's clearly sample data.
4. Currency ₪, Palestinian sample data, phone format `+970 5x xxx xxxx`.

## Responsive

Desktop-first. Breakpoints are 1279 / 1023 / 767 / 359 px. Below 1024 the sidebar becomes a top bar + drawer. Tap targets must be at least 40px on mobile.
