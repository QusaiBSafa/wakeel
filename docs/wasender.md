# WhatsApp test connection through WasenderAPI

This is a **test-only** way to connect a business's WhatsApp number to Hudhud without anyone from Hudhud in the loop. The owner scans a QR code from the dashboard, and messages start arriving.

[WasenderAPI](https://wasenderapi.com) is **not** an official Meta API. It links to the number as a "linked device", like WhatsApp Web.

- WhatsApp may restrict or ban numbers used this way.
- Use test numbers only, never a real business's main number.
- The production path is still the plan in `docs/plans/whatsapp-ai-agents-plan.md`.

## What the owner does

1. Go to **إعدادات الحساب › واتساب** (or step 7 of onboarding) and press **اربط رقم واتساب**.
2. Type the number and press **اعرض رمز الربط**. A QR appears and refreshes by itself.
3. On the phone, open WhatsApp › **الإعدادات › الأجهزة المرتبطة › ربط جهاز**, and scan the code.
4. The card switches to **واتساب متصل**.

If they scan and then close the page, the connection still completes through the webhook. If they close the page **before** scanning, the unfinished Wasender session stays until they press «اعرض رمز الربط» again (which replaces it) or «إلغاء». Abandoned sessions are not cleaned up automatically yet, so check the Wasender dashboard now and then.

## What happens on the server

| Step | Code |
| --- | --- |
| Create a Wasender session for the business. The session is created with:<br>• `log_messages: false` (Wasender keeps no message log);<br>• `account_protection: true` (Wasender throttles sending);<br>• a webhook URL with a random per-business token | `POST /api/app/whatsapp/pair` → `startPairing()` in `lib/server/wa/pairing.ts` |
| Show and refresh the QR (raw QR strings are drawn with `qrcode`) | `GET /api/app/whatsapp/pair` every 3 s → `pairingState()` |
| On scan, save the connection:<br>• `provider = 'wasender'`, `is_stub = false`;<br>• the session API key encrypted with `HUDHUD_ENC_KEY`;<br>• only the SHA-256 of the webhook token | `finalizePairing()`, from the poll or from the `session.status` webhook (whichever comes first; an advisory lock makes it run once) |
| Incoming messages | `POST /api/webhooks/wasender/[token]` → `handleWasenderWebhook()`:<br>• unknown token → 404;<br>• checks `X-Webhook-Signature` when Wasender returned a webhook secret;<br>• skips the business's own messages, groups, broadcasts and channels;<br>• counts `messages`, plus `conversations` (first message from a sender that day), in `daily_stats`;<br>• sets `last_inbound_at`;<br>• redeliveries are ignored (`wa_events` keeps the event id and a keyed hash of the sender for 3 days) |
| Session drops | `session.status`:<br>• `logged_out`/`expired` → `disconnected`;<br>• `need_scan`/`disconnected`/`error` → `needs_attention`;<br>• `connected` → `connected` |
| «افصل الرقم» | Logs the device out at Wasender, deletes the session, and forgets the key and token (`disconnectProvider()`) |

**Privacy.** The product rule still holds: no message text is read, stored or logged. The owner sees counts (Home, Account › «رسائل هذا الشهر») and the time of the last message.

**Not built yet:** the AI does not reply. `sendText()` in `lib/server/wa/wasender.ts` is ready for the agent (plan W7).

## Setup (staging)

1. Create a WasenderAPI account and subscribe. The QR endpoint needs an active plan. The vendor lists a 3-day trial, then about $6 per number per month.
2. In Wasender › Settings, create a **Personal Access Token**. It is used for creating and deleting sessions. Each session has its own API key, which Hudhud stores encrypted.
3. Set these on the Vercel project (`hudhud-staging`):

   | Variable | Value |
   | --- | --- |
   | `HUDHUD_WA_PROVIDER` | `wasender` (unset = the old stub flow) |
   | `WASENDER_PAT` | The Personal Access Token. **Sensitive** |
   | `HUDHUD_ENC_KEY` | `openssl rand -base64 32`. **Sensitive.** Changing it makes stored keys unreadable, so reconnect after changing it |
   | `HUDHUD_PUBLIC_URL` | Optional. The public base URL Wasender should call, for example `https://hudhud-staging.vercel.app`. Needed when the URL the owner uses is protected by Vercel Deployment Protection, because Wasender cannot pass that login |
   | `WASENDER_BASE_URL` | Tests only (a local fake) |

4. Redeploy. `vercel-build` applies migration `0004_wa_wasender` (additive only).
5. Smoke test with a spare phone:
   1. connect;
   2. send a message from another phone;
   3. Home «المحادثات» and Account «رسائل هذا الشهر» go up, and «آخر رسالة مستلمة» updates;
   4. disconnect;
   5. the session disappears from the Wasender dashboard.

With `HUDHUD_WA_PROVIDER=wasender`, the fake Meta routes (`/api/app/whatsapp/connect/*`, `/renew`) answer 404.
