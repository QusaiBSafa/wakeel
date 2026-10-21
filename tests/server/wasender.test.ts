import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { cleanup, HAS_DB, makeBusiness } from './helpers';

/** A fake WasenderAPI: records requests and answers like the real one (shapes from the official SDK). */
function fakeWasender(opts: { status?: string; apiKeyInDetails?: boolean; webhookSecret?: string } = {}) {
  const calls: { method: string; path: string; auth: string; body: Record<string, unknown> | null }[] = [];
  let status = opts.status ?? 'need_scan';
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace('http://wasender.test/api', '');
    const body = init.body ? JSON.parse(String(init.body)) : null;
    calls.push({ method: init.method || 'GET', path, auth: String((init.headers as Record<string, string>).Authorization), body });
    const ok = (data: unknown) => new Response(JSON.stringify({ success: true, message: 'ok', ...(data as object) }), { status: 200 });
    if (path === '/whatsapp-sessions' && init.method === 'POST') return ok({ data: { id: 77, name: body.name, phone_number: body.phone_number, status: 'disconnected', ...(opts.webhookSecret ? { webhook_secret: opts.webhookSecret } : {}) } });
    if (path === '/whatsapp-sessions/77/connect') return ok({ data: { status: 'need_scan', qrCode: '2@raw-qr-string' } });
    if (path === '/whatsapp-sessions/77/qrcode') return ok({ data: { qrCode: '2@raw-qr-string-2' } });
    if (path === '/whatsapp-sessions/77' && (init.method || 'GET') === 'GET') return ok({ data: { id: 77, name: 'x', phone_number: '+970591234567', status, ...(opts.apiKeyInDetails ? { api_key: 'sess-key-1' } : {}) } });
    if (path === '/whatsapp-sessions/77/regenerate-key') return new Response(JSON.stringify({ success: true, api_key: 'sess-key-2' }), { status: 200 });
    if (path === '/whatsapp-sessions/77/disconnect') return ok({ data: { status: 'disconnected', message: 'ok' } });
    if (path === '/whatsapp-sessions/77' && init.method === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ success: false, message: 'not found' }), { status: 404 });
  });
  vi.stubGlobal('fetch', fetch);
  return { calls, setStatus: (s: string) => (status = s), hookToken: () => String(calls.find((c) => c.path === '/whatsapp-sessions')!.body!.webhook_url).split('/').pop()! };
}

const msg = (id: string, from: string, extra: Record<string, unknown> = {}) => ({
  event: 'messages.received',
  timestamp: 1,
  data: { key: { id, fromMe: false, remoteJid: `${from}@s.whatsapp.net`, cleanSenderPn: from, ...extra }, message: { conversation: 'نص لا يُحفظ' } },
});

describe.skipIf(!HAS_DB)('WasenderAPI linked-device connection', () => {
  beforeAll(() => {
    process.env.HUDHUD_WA_PROVIDER = 'wasender';
    process.env.WASENDER_PAT = 'pat-test';
    process.env.WASENDER_BASE_URL = 'http://wasender.test/api';
    process.env.HUDHUD_ENC_KEY = Buffer.alloc(32, 7).toString('base64');
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    delete process.env.HUDHUD_WA_PROVIDER;
    await cleanup();
  });

  it('pairs end to end: session without message logs, QR rendered, connection saved with an encrypted key', async () => {
    const { db, schema } = await import('@/lib/db');
    const { startPairing, pairingState } = await import('@/lib/server/wa/pairing');
    const w = fakeWasender({ apiKeyInDetails: true });
    const b = await makeBusiness();

    const first = await startPairing(b, '+970 59 123 4567', 'https://hudhud.test');
    expect(first.status).toBe('need_scan');
    expect(first.qr).toMatch(/^data:image\/png;base64,/);
    const create = w.calls.find((c) => c.path === '/whatsapp-sessions')!;
    expect(create.auth).toBe('Bearer pat-test');
    expect(create.body).toMatchObject({ phone_number: '+970591234567', log_messages: false, account_protection: true, webhook_enabled: true });
    expect(String(create.body!.webhook_url)).toMatch(/^https:\/\/hudhud\.test\/api\/webhooks\/wasender\/[A-Za-z0-9_-]{40,}$/);

    expect((await pairingState(b)).status).toBe('need_scan');
    w.setStatus('connected');
    expect(await pairingState(b)).toEqual({ status: 'connected', phone: '+970 59 123 4567' });

    const [conn] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(conn).toMatchObject({ status: 'connected', provider: 'wasender', externalId: '77', isStub: false, phone: '+970 59 123 4567' });
    expect(conn.apiKeyEnc).toMatch(/^v1\./);
    expect(conn.apiKeyEnc).not.toContain('sess-key-1');
    expect(await db().select().from(schema.waPairings).where(eq(schema.waPairings.businessId, b.id))).toHaveLength(0);
    // the key was in the session details, so it was not regenerated
    expect(w.calls.some((c) => c.path.endsWith('/regenerate-key'))).toBe(false);
  });

  it('a session.status webhook finishes the pairing even when the owner closed the page', async () => {
    const { db, schema } = await import('@/lib/db');
    const { decrypt } = await import('@/lib/server/crypto');
    const { startPairing, handleWasenderWebhook } = await import('@/lib/server/wa/pairing');
    const w = fakeWasender();
    const b = await makeBusiness();
    await startPairing(b, '+970 59 123 4567', 'https://hudhud.test');

    expect(await handleWasenderWebhook('wrong-token-wrong-token-1', null, { event: 'session.status', data: { status: 'connected' } })).toBe(404);
    expect(await handleWasenderWebhook(w.hookToken(), null, { event: 'session.status', data: { status: 'connected' } })).toBe(200);

    const [conn] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(conn.status).toBe('connected');
    // no key in the session details → regenerated once
    expect(decrypt(conn.apiKeyEnc!)).toBe('sess-key-2');
  });

  it('counts incoming messages and conversations, ignores duplicates, own messages and groups, and stores no text', async () => {
    const { db, schema } = await import('@/lib/db');
    const { startPairing, pairingState, handleWasenderWebhook } = await import('@/lib/server/wa/pairing');
    const w = fakeWasender({ apiKeyInDetails: true });
    const b = await makeBusiness();
    await startPairing(b, '+970 59 123 4567', 'https://hudhud.test');
    w.setStatus('connected');
    await pairingState(b);
    const t = w.hookToken();

    expect(await handleWasenderWebhook(t, null, msg('m1', '970599000001'))).toBe(200);
    expect(await handleWasenderWebhook(t, null, msg('m1', '970599000001'))).toBe(200); // redelivery
    expect(await handleWasenderWebhook(t, null, msg('m2', '970599000001'))).toBe(200); // same customer
    expect(await handleWasenderWebhook(t, null, msg('m3', '970599000002'))).toBe(200); // new customer
    await handleWasenderWebhook(t, null, msg('m4', '970599000003', { fromMe: true }));
    await handleWasenderWebhook(t, null, { event: 'messages.received', data: { key: { id: 'm5', fromMe: false, remoteJid: '1203630@g.us' } } });

    const [s] = await db().select().from(schema.dailyStats).where(eq(schema.dailyStats.businessId, b.id));
    expect(s).toMatchObject({ messages: 3, conversations: 2 });
    const [conn] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(conn.lastInboundAt).not.toBeNull();
    const events = await db().select().from(schema.waEvents).where(eq(schema.waEvents.businessId, b.id));
    expect(events).toHaveLength(3);
    expect(JSON.stringify(events)).not.toMatch(/970599|نص/);
  });

  it('checks X-Webhook-Signature when Wasender gave a secret, and maps logged_out to disconnected', async () => {
    const { db, schema } = await import('@/lib/db');
    const { startPairing, pairingState, handleWasenderWebhook } = await import('@/lib/server/wa/pairing');
    const w = fakeWasender({ apiKeyInDetails: true, webhookSecret: 'whsec-1' });
    const b = await makeBusiness();
    await startPairing(b, '+970 59 123 4567', 'https://hudhud.test');
    w.setStatus('connected');
    await pairingState(b);
    const t = w.hookToken();

    expect(await handleWasenderWebhook(t, null, msg('a1', '970599000001'))).toBe(401);
    expect(await handleWasenderWebhook(t, 'nope', msg('a1', '970599000001'))).toBe(401);
    expect(await handleWasenderWebhook(t, 'whsec-1', { event: 'session.status', data: { status: 'logged_out' } })).toBe(200);
    const [conn] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(conn.status).toBe('disconnected');
    expect(conn.disconnectedAt).not.toBeNull();
  });

  it('disconnect logs the device out at Wasender and forgets the key and webhook token', async () => {
    const { db, schema } = await import('@/lib/db');
    const { startPairing, pairingState, disconnectProvider } = await import('@/lib/server/wa/pairing');
    const w = fakeWasender({ apiKeyInDetails: true });
    const b = await makeBusiness();
    await startPairing(b, '+970 59 123 4567', 'https://hudhud.test');
    w.setStatus('connected');
    await pairingState(b);
    await disconnectProvider(b.id);
    expect(w.calls.some((c) => c.method === 'DELETE' && c.path === '/whatsapp-sessions/77')).toBe(true);
    const [conn] = await db().select().from(schema.whatsappConnections).where(eq(schema.whatsappConnections.businessId, b.id));
    expect(conn).toMatchObject({ apiKeyEnc: null, hookTokenHash: null, externalId: null });
  });

  it('the stub connect routes do not exist while the wasender provider is active', async () => {
    const { assertStub } = await import('@/lib/server/wa/pairing');
    expect(() => assertStub()).toThrow();
  });
});
