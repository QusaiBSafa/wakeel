import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { findBusiness, type BusinessRow } from './state';
import { firstError } from '@/lib/validation';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new HttpError(401, 'لازم تسجّل دخول');
  return userId;
}

/** The signed-in user's business. Never trust an id from the client. */
export async function requireBusiness(): Promise<{ userId: string; business: BusinessRow }> {
  const userId = await requireUserId();
  const business = await findBusiness(userId);
  if (!business) throw new HttpError(404, 'لسّا ما أنشأت شركتك');
  return { userId, business };
}

const MAX_BODY = 64 * 1024;

export async function readJson(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) throw new HttpError(413, 'الطلب كبير كثير');
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'الطلب كبير كثير');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, 'البيانات مش صحيحة');
  }
}

export async function parseBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  const raw = await readJson(req);
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, firstError(r.error));
  return r.data;
}

/** Wrap a route handler so thrown HttpErrors become JSON responses and anything else a 500. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      // unique violations from Postgres
      if (typeof e === 'object' && e && 'code' in e && (e as { code?: string }).code === '23505') {
        return json({ error: 'هالقيمة مستخدمة من قبل' }, 409);
      }
      console.error('api error', e);
      return json({ error: 'صار خلل، جرّب كمان مرة' }, 500);
    }
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(id: string) {
  if (!UUID_RE.test(id)) throw new HttpError(404, 'مش موجود');
}
