import 'server-only';
import { HttpError } from '../api';

/**
 * Minimal WasenderAPI client (https://wasenderapi.com/api-docs). Paths and shapes follow their official SDK
 * (npm `wasenderapi`): session management uses the account's Personal Access Token, sending uses the
 * session's own API key. Message text is never logged here.
 */

export type WasenderStatus = 'connected' | 'disconnected' | 'need_scan' | 'connecting' | 'logged_out' | 'expired' | 'error';

export type WasenderSession = {
  id: number;
  name: string;
  phone_number: string;
  status: WasenderStatus;
  api_key?: string;
  webhook_secret?: string;
};

const base = () => (process.env.WASENDER_BASE_URL || 'https://www.wasenderapi.com/api').replace(/\/$/, '');

function pat(): string {
  const t = process.env.WASENDER_PAT;
  if (!t) throw new Error('WASENDER_PAT is not set');
  return t;
}

const UNAVAILABLE = 'تعذّر الاتصال بخدمة واتساب، أعد المحاولة بعد قليل';

async function call<T>(method: string, path: string, token: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(base() + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
  } catch {
    console.error(`[wasender] network error ${method} ${path.replace(/\d+/g, ':id')}`);
    throw new HttpError(502, UNAVAILABLE);
  }
  if (res.status === 204) return { success: true } as T;
  const json = (await res.json().catch(() => null)) as ({ success?: boolean; message?: string } & T) | null;
  if (!res.ok || !json || json.success === false) {
    console.error(`[wasender] ${method} ${path.replace(/\d+/g, ':id')} → ${res.status}`);
    if (res.status === 429) throw new HttpError(429, 'طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة');
    throw new HttpError(502, UNAVAILABLE);
  }
  return json;
}

const EVENTS = ['messages.received', 'session.status', 'qrcode.updated'];

export async function createSession(input: { name: string; phone: string; webhookUrl: string }): Promise<WasenderSession> {
  const r = await call<{ data: WasenderSession }>('POST', '/whatsapp-sessions', pat(), {
    name: input.name,
    phone_number: input.phone,
    // Wasender's built-in throttling of outgoing messages, to lower the risk of WhatsApp restricting the number.
    account_protection: true,
    // Do not let Wasender keep a log of message content.
    log_messages: false,
    webhook_url: input.webhookUrl,
    webhook_enabled: true,
    webhook_events: EVENTS,
  });
  return r.data;
}

export async function getSession(id: string): Promise<WasenderSession> {
  return (await call<{ data: WasenderSession }>('GET', `/whatsapp-sessions/${id}`, pat())).data;
}

/** Starts the connection. The QR may come back here already; otherwise ask qrCode(). */
export async function connectSession(id: string): Promise<{ status: WasenderStatus; qrCode?: string }> {
  return (await call<{ data: { status: WasenderStatus; qrCode?: string } }>('POST', `/whatsapp-sessions/${id}/connect`, pat(), {})).data;
}

export async function qrCode(id: string): Promise<string> {
  return (await call<{ data: { qrCode: string } }>('GET', `/whatsapp-sessions/${id}/qrcode`, pat())).data.qrCode;
}

export async function regenerateKey(id: string): Promise<string> {
  return (await call<{ api_key: string }>('POST', `/whatsapp-sessions/${id}/regenerate-key`, pat(), {})).api_key;
}

/** Best effort: logs out the linked device and removes the session so it stops counting against the plan. */
export async function removeSession(id: string): Promise<void> {
  await call('POST', `/whatsapp-sessions/${id}/disconnect`, pat(), {}).catch(() => {});
  await call('DELETE', `/whatsapp-sessions/${id}`, pat()).catch(() => {});
}

/** `to` is the number in international format. Throws HttpError on failure. */
export async function sendText(apiKey: string, to: string, text: string): Promise<void> {
  await call('POST', '/send-message', apiKey, { to, text });
}
