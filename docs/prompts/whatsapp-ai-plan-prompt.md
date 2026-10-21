# Prompt: write the plan for WhatsApp (Dualhook), AI agents and admin monitoring

Copy everything below the line into a fresh agent session that has this repo checked out on `feature/dashboard`.

---

You are a senior engineer planning the next stage of **هُدهُد (Hudhud)**, the Next.js 16 app in this repo. Hudhud lets a small business connect its WhatsApp number so an AI assistant answers buyers using that business's own data (catalog, prices, stock, hours, bookings, orders, FAQs).

**Your deliverable is a plan, not code.** Write `docs/plans/whatsapp-ai-agents-plan.md`, commit it, and push to `feature/dashboard`. Do not change any application code in this task.

Write the plan for an implementer who has **only that file and the repo**. Use the same style as `docs/plans/dashboard-v2-implementation.md`: ground rules first, then an audit of what exists, then data model and API, then numbered phases. Each phase lists its files, steps, tests, a verification checklist and a commit.

## 1. Read these first

Read them before you write anything. Cite file paths in the plan instead of describing code from memory.

- `docs/plans/dashboard-v2-implementation.md`: the conventions, ground rules and product rules. Section 0 ("Ground rules") and the "Risks and open questions" section are the most important.
- `docs/ingest.md` and `app/api/internal/ingest/route.ts`, `lib/server/ingest.ts`, `lib/validation/ingest.ts`: the existing contract a bot uses to report stats, attention items, orders, bookings, FAQ usage and WhatsApp status.
- `lib/db/schema.ts` and `drizzle/`: the current schema, especially `whatsapp_connections` (`is_stub`), `ai_settings`, `daily_stats`, `attention_items`, `orders`, `bookings`, `products` (`catalogItems`), `faqs` and `team_members`.
- `app/api/app/whatsapp/*` and `components/account/AccountWhatsApp.tsx`, `components/onboarding/WhatsAppConnect.tsx`: the current **stubbed** connect, verify, renew and disconnect flow.
- `lib/validation/ai.ts`, `lib/server/ai.ts` (`aiEffective`), `app/api/app/ai/*`, `lib/client/test-chat.ts`: the AI settings the owner already controls (mode `auto`/`approve`, language, tone, permissions, handoff rules, `pausedUntil`, after-hours behaviour) and the client-only test chat.
- `lib/server/orders.ts`, `lib/server/bookings.ts`, `lib/availability.ts`, `lib/server/catalog.ts`, `lib/server/stats.ts`, `lib/server/send.ts`: the server functions the AI must reuse instead of reimplementing.
- `app/api/admin/route.ts` and `proxy.ts`: today's admin is a basic-auth HTML page that lists landing-page leads from Blob. Clerk runs only on the matched routes.
- `vercel.json` (region `fra1`, `npm run vercel-build` runs migrations), `package.json`, `lib/db/index.ts` (Neon serverless).

Then read the **current** documentation and do not invent endpoints, payloads or limits. For anything you cannot confirm, write `TODO(verify): …` in the plan and add it to the open questions.
- Dualhook: onboarding, Embedded Signup with **coexistence** (the business keeps using the WhatsApp Business app), webhook override to our server, token handling, the app-open heartbeat requirement, disconnect, pricing tiers and any partner or API keys.
- Meta WhatsApp Cloud API: webhook verification (`hub.challenge`), `X-Hub-Signature-256`, message and status payloads, the 24-hour customer-service window, templates, rate limits and the quality rating.
- Vercel: Functions (Fluid compute, `maxDuration`, `after()`/`waitUntil`), Queues or another durable queue, Cron Jobs, AI Gateway, environment variables and secrets, Observability and log drains, and the Marketplace options for Redis or KV.
- OpenAI (ChatGPT) and DeepSeek APIs: tool/function calling, JSON output, timeouts, rate limits, pricing per token and data-retention terms.

## 2. What the plan must cover

### A. Connecting WhatsApp through Dualhook, with admin approval

The user experience, step by step, for both sides:

1. **Owner requests a connection.** On `/dashboard/account` (WhatsApp section) and in onboarding, the owner presses «طلب ربط واتساب», confirms the number and business name, and agrees to the terms. The state becomes «بانتظار موافقة الإدارة». The owner cannot start the Meta/Dualhook flow yet.
2. **Admin reviews.** The admin sees the request in an approvals queue with the business profile, how complete it is (catalog, hours, FAQs) and the requested number. The admin approves, or rejects with a reason the owner can see. The admin can also revoke a connection later.
3. **Owner connects.** After approval the owner gets a notification (dashboard banner, plus email if configured) and a «ابدأ الربط» button. That button runs Dualhook's Embedded Signup with coexistence. On success we store the WABA id, phone number id, display name and token metadata, subscribe the webhooks, and mark the connection `connected` with `is_stub = false`.
4. **After connecting:** show health (last message received, last reply, quality rating, the coexistence heartbeat / days until the app must be opened), reconnect, disconnect, and what happens to the AI when the connection drops.

Define a **state machine** with every state, every transition, who may trigger it (owner, admin, Dualhook/Meta webhook, cron) and the exact Arabic UI copy for each state. At minimum: `none → requested → approved → connecting → connected`, plus `rejected`, `needs_attention`, `disconnected` and `revoked`. Every transition writes an audit row with actor, time and reason. State how the new states map onto the existing `wa_status` enum and `whatsapp_connections` table, using additive migrations only (see 3.1 of the v2 plan).

### B. Vercel infrastructure for multiple AI agents

Design the message pipeline end to end:

1. `POST /api/webhooks/whatsapp` (outside `/api/app`, not behind Clerk): verify the signature, answer 200 fast, and enqueue. Handle the GET verification challenge.
2. **Routing:** resolve the business from the `phone_number_id`. Never take a business id from the payload body or the model.
3. **Idempotency** by WhatsApp message id. Keep the order of messages per customer conversation. Retry with backoff, and send messages that keep failing to a dead-letter table the admin can see.
4. **A worker** that loads the business context, calls the model with tools, applies the owner's AI settings and sends the reply through the Cloud API, replacing `stubSend`.
5. **A provider abstraction** for ChatGPT (OpenAI) and DeepSeek, built so another provider can be added later. Compare **Vercel AI Gateway + AI SDK** with direct SDKs and recommend one. Cover:
   - which model each business uses, chosen by the admin, with a global default;
   - automatic fallback to the other provider on timeout or 5xx;
   - per-request timeouts and a token budget;
   - recording tokens, cost and latency per business per day;
   - a global kill switch and a per-business kill switch;
   - per-business rate limits.
6. Function config: region `fra1` next to Neon, `maxDuration`, concurrency, cold starts, and how the 24-hour window and templates affect replies.
7. Every new environment variable with its purpose, which environments it is set in and who owns it. Secrets never reach the client or the logs. Store tokens encrypted at rest and describe key rotation.

### C. Answering a buyer from the business's own data

When a buyer asks something, the agent answers from that business's account only. Specify:

1. **The tools the model can call**, each with its input schema, output, the `lib/server/*` function it wraps and the permission flag in `ai_settings.config.perms` that gates it. For example: business info and hours, search the catalog with price/variant/stock, available booking slots, create a draft order, create a booking, the status of this customer's order or booking (matched by the sender's phone only), and match an FAQ (which also sends `faq_used`).
2. **How the system prompt is built** from the business profile, policies, rules and AI config (language, tone, name, emoji), and how answers stay grounded. If no tool returns the fact, the agent does not guess. It follows the owner's `unk` setting and the handoff rules.
3. **Handoff:** when a rule fires (complaint, discount, a large order over `bigMinor`, a group over `groupNum`, unknown, the customer asks for a human), create an `attention_items` row and pause or continue per settings. Respect `mode: 'approve'`, `aiEffective` / `pausedUntil` and after-hours behaviour.
4. **Safety:** tenant isolation tests, prompt-injection resistance (catalog text and customer messages are data, not instructions), never revealing other customers' data, and output limits.
5. **Writing results back:** reuse the ingest logic directly (or call it in-process) so stats, orders, bookings, attention items and `wa` status land in the same tables the dashboard already reads.

**Privacy conflict you must resolve explicitly.** The current non-negotiable rule is: *no conversation or message content is stored, shown or logged.* A multi-turn agent needs some short-term context. Present the options, for example:
- no history at all;
- the last N turns held in Redis/KV with a short TTL and encryption, never shown in any UI;
- stored transcripts, which would require changing the rule.

For each option give the trade-offs, the cost and how it is enforced in code and logs. Recommend the most privacy-preserving option that still works, and list it as an open question for the user. Whatever you choose, logs and the admin UI show metadata and counts only.

### D. Multiple users and monitoring

1. **Multi-tenancy:** every query is scoped by `business_id` (the `requireBusiness()` pattern). Cover team members' access to the new WhatsApp and AI pages per `team_role`.
2. **Real admin area:** replace basic auth with Clerk plus an admin role (an allowlist or `publicMetadata.role`) and add admin routes to `proxy.ts`. Every admin action is audited. If you plan a read-only "view as business" mode, define it.
3. **Admin monitoring pages,** with filters by date range and business:
   - **Overview:** active businesses, connected numbers, pending approvals, conversations, messages, auto-reply rate, handoffs, orders and bookings created by the AI, AI cost.
   - **Users / businesses:** list, status, plan, WhatsApp state, last activity, completeness; plus a drill-down per business.
   - **Orders** and **bookings** across all businesses, without customer message content.
   - **Chat statistics** from `daily_stats` and the new usage table: volume, reply time, handoff reasons, FAQ hits, per-model tokens and cost, error rate.
   - **System health:** webhook failures, queue lag, dead letters, provider errors and fallbacks, connections needing attention, heartbeat expiring soon.
   - **Approvals queue** and **audit log**.
4. **Owner-side monitoring:** extend the existing Home and stats in the dashboard with chat statistics (conversations, auto-replied, handed off, average reply time), plus orders and bookings by source (`ai` vs `owner`), over a day, week or month. Use only the existing design system in `docs/design/dashboard-v2/` and `app/styles/`.
5. **Alerts:** what notifies the admin (and the owner) and through which channel. For example: a connection drops, the error rate spikes, the AI budget is exceeded, the heartbeat expires soon.

## 3. Required sections in the plan file

1. Ground rules, carried over from the v2 plan and still binding:
   - MSA Arabic RTL copy;
   - no payment fields anywhere;
   - no new UI framework;
   - Next.js 16 conventions;
   - `npm run lint && npm run typecheck && npm test && npm run build` passes before every commit;
   - the privacy rule, as resolved in C.
2. An audit of what exists today, and what is stubbed versus real.
3. An architecture diagram (Mermaid or ASCII) of the webhook → queue → worker → model → tools → Cloud API → stats flow.
4. The data model: new tables and columns with their types, indexes and migrations. For example:
   - `whatsapp_connection_requests`;
   - extra columns on `whatsapp_connections` (WABA id, phone number id, encrypted token ref, heartbeat time);
   - `webhook_events` (metadata only, for idempotency);
   - `ai_usage_daily`;
   - `admin_audit`;
   - `admin_users` or role config;
   - `dead_letters`.
5. The API surface: every new route with its method, auth, request and response, and its errors in Arabic.
6. Environment variables and secrets.
7. Phases in implementation order, each small enough for one commit and independently verifiable on `hudhud-staging`. Suggested order: admin auth → connection requests and approval UI → Dualhook connect (behind a flag, stub kept for local dev) → webhook receiver and queue → provider layer → tools and agent → sending replies → stats and usage → admin monitoring → owner monitoring → alerts → hardening.
8. A test plan:
   - unit tests with mocked providers and Dualhook/Meta payloads;
   - signature and idempotency tests;
   - tenant-isolation tests;
   - an e2e run against a fake WhatsApp sender locally;
   - a staging smoke checklist with a real test number.
9. Rollout: feature flags, the first pilot businesses, a cost ceiling, and a rollback plan.
10. A cost estimate per 1,000 conversations for each model option, plus the Vercel and Dualhook costs, with the assumptions stated.
11. Risks and open questions. Each question has a stated default the plan proceeds with, as in the v2 plan.

Keep the plan concrete: real file paths, real function names from the repo, exact copy for the UI, and numbers for the limits. When you are done, reply with the path to the plan, a five-line summary, and the open questions.
