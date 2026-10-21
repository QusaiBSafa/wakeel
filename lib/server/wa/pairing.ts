import 'server-only';
import { and, eq, lt, ne, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, schema } from '@/lib/db';
import { addDays, ymd } from '@/lib/time';
import { HttpError } from '../api';
import type { BusinessRow } from '../business';
import { bumpStat } from '../stats';
import { decrypt, encrypt, hashId, randomToken, safeEqual, sha256 } from '../crypto';
import * as wasender from './wasender';

const { whatsappConnections, waPairings, waEvents, businesses } = schema;

export type WaProvider = 'stub' | 'wasender';
export const waProvider = (): WaProvider => (process.env.HUDHUD_WA_PROVIDER === 'wasender' ? 'wasender' : 'stub');

/** Guard for the fake Meta flow: it only exists while the stub provider is active. */
export function assertStub() {
  if (waProvider() !== 'stub') throw new HttpError(404, 'غير موجود');
}

export type PairState = { status: 'none' | 'need_scan' | 'connecting' | 'connected'; qr?: string; phone?: string };

const intl = (phone: string) => '+' + phone.replace(/\D/g, '');

async function qrImage(raw: string): Promise<string> {
  if (raw.startsWith('data:image')) return raw;
  return QRCode.toDataURL(raw, { margin: 1, width: 280, errorCorrectionLevel: 'M' });
}

/** Creates a Wasender session for this business and returns the first QR. Any earlier unfinished pairing is dropped. */
export async function startPairing(business: BusinessRow, phone: string, origin: string): Promise<PairState> {
  const d = db();
  const [conn] = await d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1);
  if (conn && conn.status !== 'disconnected') throw new HttpError(409, 'رقم واتساب متصل بالفعل. افصله أولاً لربط رقم آخر');
  await cancelPairing(business);

  const token = randomToken();
  const s = await wasender.createSession({ name: `${business.name || 'هُدهُد'} · ${business.id.slice(0, 8)}`, phone: intl(phone), webhookUrl: `${origin}/api/webhooks/wasender/${token}` });
  await d.insert(waPairings).values({
    businessId: business.id,
    provider: 'wasender',
    externalId: String(s.id),
    phone,
    webhookSecretEnc: s.webhook_secret ? encrypt(s.webhook_secret) : null,
    hookTokenHash: sha256(token),
  });
  const c = await wasender.connectSession(String(s.id));
  if (c.status === 'connected') return pairingState(business);
  return { status: 'need_scan', qr: await qrImage(c.qrCode || (await wasender.qrCode(String(s.id)))), phone };
}

/** Polled by the connect screen every few seconds: a fresh QR while waiting, `connected` once scanned. */
export async function pairingState(business: BusinessRow): Promise<PairState> {
  const d = db();
  const [conn] = await d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1);
  const [p] = await d.select().from(waPairings).where(eq(waPairings.businessId, business.id)).limit(1);
  if (!p) return conn && conn.status !== 'disconnected' ? { status: 'connected', phone: conn.phone } : { status: 'none' };

  const s = await wasender.getSession(p.externalId);
  if (s.status === 'connected') {
    await finalizePairing(business.id, p.externalId, s);
    return { status: 'connected', phone: p.phone };
  }
  if (s.status === 'connecting') return { status: 'connecting', phone: p.phone };
  // need_scan, or a session that dropped before it was scanned: ask for a (new) QR
  if (s.status !== 'need_scan') {
    const c = await wasender.connectSession(p.externalId);
    if (c.qrCode) return { status: 'need_scan', qr: await qrImage(c.qrCode), phone: p.phone };
  }
  return { status: 'need_scan', qr: await qrImage(await wasender.qrCode(p.externalId)), phone: p.phone };
}

export async function cancelPairing(business: BusinessRow) {
  const [p] = await db().delete(waPairings).where(eq(waPairings.businessId, business.id)).returning();
  if (p) await wasender.removeSession(p.externalId);
}

/**
 * Turns a scanned pairing into the business's connection. Safe to call from the poll and the webhook at the same
 * time: a per-business advisory lock serialises them and the second caller finds no pairing left.
 */
export async function finalizePairing(businessId: string, externalId: string, session?: wasender.WasenderSession) {
  await db().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${businessId}))`);
    const [p] = await tx.select().from(waPairings).where(and(eq(waPairings.businessId, businessId), eq(waPairings.externalId, externalId))).limit(1);
    if (!p) return;
    const [b] = await tx.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, businessId)).limit(1);
    const s = session?.api_key ? session : await wasender.getSession(externalId);
    const apiKey = s.api_key || (await wasender.regenerateKey(externalId));
    const now = new Date();
    const row = {
      status: 'connected' as const,
      phone: p.phone,
      displayName: b?.name ?? '',
      connectedAt: now,
      tokenExpiresAt: null,
      disconnectedAt: null,
      quality: 'good',
      isStub: false,
      provider: 'wasender',
      externalId,
      apiKeyEnc: encrypt(apiKey),
      webhookSecretEnc: p.webhookSecretEnc ?? (s.webhook_secret ? encrypt(s.webhook_secret) : null),
      hookTokenHash: p.hookTokenHash,
    };
    await tx.delete(waPairings).where(eq(waPairings.businessId, businessId));
    await tx.insert(whatsappConnections).values({ businessId, ...row }).onConflictDoUpdate({ target: whatsappConnections.businessId, set: row });
  });
}

/** Called by the owner's «افصل الرقم»: logs the device out at Wasender and forgets the keys. */
export async function disconnectProvider(businessId: string) {
  const [conn] = await db().select().from(whatsappConnections).where(eq(whatsappConnections.businessId, businessId)).limit(1);
  if (!conn || conn.provider !== 'wasender') return;
  if (conn.externalId) await wasender.removeSession(conn.externalId);
  await db().update(whatsappConnections).set({ apiKeyEnc: null, webhookSecretEnc: null, hookTokenHash: null, externalId: null }).where(eq(whatsappConnections.businessId, businessId));
}

// ---------- webhook ----------

type MsgKey = { id?: string; fromMe?: boolean; remoteJid?: string; senderPn?: string; cleanSenderPn?: string };
const NOT_A_CUSTOMER = /@(g\.us|newsletter|broadcast)$/;

/** Map Wasender's session status onto ours. `connecting` is transient and changes nothing. */
function connectionStatus(s: string): 'connected' | 'needs_attention' | 'disconnected' | null {
  if (s === 'connected') return 'connected';
  if (s === 'logged_out' || s === 'expired') return 'disconnected';
  if (s === 'need_scan' || s === 'disconnected' || s === 'error') return 'needs_attention';
  return null;
}

/**
 * Applies one Wasender webhook. Returns the HTTP status to answer with. Message content is never read beyond the
 * key (id, sender, fromMe): only counts and the time of the last inbound message are kept.
 */
export async function handleWasenderWebhook(token: string, signature: string | null, body: unknown): Promise<number> {
  const d = db();
  const h = sha256(token);
  const [conn] = await d.select().from(whatsappConnections).where(eq(whatsappConnections.hookTokenHash, h)).limit(1);
  const [pairing] = conn ? [] : await d.select().from(waPairings).where(eq(waPairings.hookTokenHash, h)).limit(1);
  if (!conn && !pairing) return 404;

  const secretEnc = conn?.webhookSecretEnc ?? pairing?.webhookSecretEnc;
  if (secretEnc && !(signature && safeEqual(signature, decrypt(secretEnc)))) return 401;

  const ev = body && typeof body === 'object' ? (body as { event?: unknown; data?: unknown }) : {};
  const event = typeof ev.event === 'string' ? ev.event : '';
  const items = (Array.isArray(ev.data) ? ev.data : [ev.data]).filter((x): x is Record<string, unknown> => !!x && typeof x === 'object');

  if (event === 'session.status') {
    const status = String(items[0]?.status ?? '');
    if (pairing && status === 'connected') await finalizePairing(pairing.businessId, pairing.externalId);
    const to = conn && connectionStatus(status);
    if (conn && to && to !== conn.status) {
      await d
        .update(whatsappConnections)
        .set({ status: to, ...(to === 'disconnected' ? { disconnectedAt: new Date() } : {}), ...(to === 'connected' ? { disconnectedAt: null } : {}) })
        .where(eq(whatsappConnections.businessId, conn.businessId));
    }
    return 200;
  }

  if ((event === 'messages.received' || event === 'messages-personal.received' || event === 'messages.upsert') && conn && conn.status !== 'disconnected') {
    for (const m of items) {
      const key = (m.key ?? {}) as MsgKey;
      if (!key.id || key.fromMe || !key.remoteJid || NOT_A_CUSTOMER.test(key.remoteJid)) continue;
      const sender = (key.cleanSenderPn || key.senderPn || key.remoteJid).replace(/\D/g, '');
      if (sender) await recordInbound(conn.businessId, key.id, hashId(sender));
    }
  }
  return 200;
}

async function recordInbound(businessId: string, messageId: string, cust: string) {
  const d = db();
  const now = new Date();
  const day = ymd(now);
  const [row] = await d.insert(waEvents).values({ businessId, externalId: messageId, cust, day }).onConflictDoNothing().returning({ id: waEvents.externalId });
  if (!row) return; // a redelivery
  const [earlier] = await d
    .select({ id: waEvents.externalId })
    .from(waEvents)
    .where(and(eq(waEvents.businessId, businessId), eq(waEvents.cust, cust), eq(waEvents.day, day), ne(waEvents.externalId, messageId)))
    .limit(1);
  await bumpStat(businessId, 'messages', 1, day);
  if (!earlier) await bumpStat(businessId, 'conversations', 1, day);
  await d.update(whatsappConnections).set({ lastInboundAt: now }).where(eq(whatsappConnections.businessId, businessId));
  // ids are only needed for de-duplication and today's conversation count
  if (Math.random() < 0.05) await d.delete(waEvents).where(and(eq(waEvents.businessId, businessId), lt(waEvents.day, addDays(day, -2))));
}
