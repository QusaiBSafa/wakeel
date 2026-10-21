# Ingest API for the WhatsApp bot (proposal)

`POST /api/internal/ingest`

The future bot reports what it did here; the dashboard shows it. This is a proposal: the bot team may ask for changes.

## Auth

`Authorization: Bearer $HUDHUD_INGEST_SECRET` (a random value of 32+ characters set in the Vercel environment).

- The route answers **404** while `HUDHUD_INGEST_SECRET` is unset, as if it did not exist.
- A missing or wrong token is **401**. The comparison is constant-time.
- Not under `/api/app`, not behind Clerk.

## Privacy rule

No conversation or message content is accepted, stored or logged. Every body is validated with strict Zod objects:
**an unknown key is a 400**, and there is no field for message text. Order timeline entries are fixed keys, not free text.
`reason` and `suggestion` on attention items are short summaries written by the bot («يطلب خصماً»), never a quote of the customer.

## Messages

Every body has `type` and `businessId` (UUID). Success is `200 {"ok": true, "id"?: "<uuid>"}`. Errors are `{"error": "<Arabic message>"}`.
An unknown `businessId` is 404.

### `stats`
```json
{ "type": "stats", "businessId": "…", "day": "2026-03-02", "inc": { "conversations": 2, "messages": 14 } }
```
`day` is optional (default: today, Asia/Hebron). `inc` fields (all optional, at least one, integers ≥ 0):
`conversations, autoReplied, ordersLogged, bookingsConfirmed, handedOff, resolved, messages, replyMsTotal, replies`.
Counters are added to the day's row.

### `attention`
```json
{ "type": "attention", "businessId": "…", "customerName": "ليان سعادة", "customerPhone": "+970 59 402 3381",
  "reason": "تطلب خصماً على باقة العروس", "refKind": "booking", "refId": "<uuid>", "suggestion": "اعرض عليها 10%" }
```
`customerName`, `refKind`, `refId`, `suggestion` are optional. `refKind` (`order` | `booking`) and `refId` come together.
Appears in «تحتاج تدخلك». Resolving it in the dashboard deletes the row.

### `order`
```json
{ "type": "order", "businessId": "…", "source": "ai", "isDraft": true, "events": ["logged", "awaiting_address"],
  "order": { "customer": "أحمد عودة", "phone": "+970 56 412 9930", "lines": [{ "itemId": "<uuid>", "variant": "250 مل", "qty": 2 }],
             "pickup": false, "areaId": "<uuid>", "address": "البيرة، حي الجنان", "notes": "" } }
```
`order` is the same body the owner's «طلب جديد» form sends. Prices and totals are computed on the server from the catalog.
`events` (optional, default `["logged"]`): `logged`, `customer_confirmed`, `awaiting_address`.

### `booking`
```json
{ "type": "booking", "businessId": "…", "source": "ai",
  "booking": { "customer": "ميرا داود", "phone": "+970 59 621 9054", "itemId": "<uuid>", "date": "2026-03-04", "startMin": 840 } }
```
The slot is checked like a manual booking (hours, leave, buffers, lead time); a taken slot is **409**.
The status follows the business's auto-confirm setting (`confirmed` or `pending`). `startMin` is minutes after midnight.

### `faq_used`
```json
{ "type": "faq_used", "businessId": "…", "faqId": "<uuid>" }
```
Adds 1 to the FAQ's usage count for the current month.

### `wa`
```json
{ "type": "wa", "businessId": "…", "status": "needs_attention", "lastReplyAt": "2026-03-02T09:30:00Z" }
```
At least one of `status` (`connected` | `needs_attention` | `disconnected`) or `lastReplyAt`. Updates the existing connection row (404 if none).

## Try it

```sh
curl -sS -X POST http://localhost:3000/api/internal/ingest \
  -H "Authorization: Bearer $HUDHUD_INGEST_SECRET" -H 'Content-Type: application/json' \
  -d '{"type":"attention","businessId":"<id>","customerPhone":"+970 59 402 3381","reason":"يطلب خصماً"}'
```
