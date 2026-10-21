import { z } from 'zod';
import { AI_DEFAULTS } from '../constants';
import type { AiConfig } from '../types';
import { line, requiredLine } from './common';

const D = AI_DEFAULTS;
const bool = (d: boolean) => z.boolean().default(d);

/** The stored config is completed with defaults whenever it is read, so old rows never break. */
export const aiConfigSchema = z
  .object({
    mode: z.enum(['auto', 'approve']).default(D.mode),
    lang: z.enum(['match', 'fusha', 'dialect']).default(D.lang),
    tone: z.enum(['friendly', 'formal', 'short']).default(D.tone),
    name: requiredLine(30, 'اكتب اسماً لهُدهُد').default(D.name),
    emoji: bool(D.emoji),
    perms: z
      .object({ orders: bool(D.perms.orders), bookings: bool(D.perms.bookings), resched: bool(D.perms.resched), prices: bool(D.perms.prices), alt: bool(D.perms.alt), discount: bool(D.perms.discount) })
      .strict()
      .default(D.perms),
    rules: z
      .object({ human: z.literal(true).default(true), complaint: bool(D.rules.complaint), unknown: bool(D.rules.unknown), discount: bool(D.rules.discount), big: bool(D.rules.big), group: bool(D.rules.group) })
      .strict()
      .default({ ...D.rules, human: true as const }),
    bigMinor: z.number().int().min(100).max(100_000_000).default(D.bigMinor),
    groupNum: z.number().int().min(2).max(500).default(D.groupNum),
    notify: z
      .object({ dash: z.literal(true).default(true), wa: bool(D.notify.wa), email: bool(D.notify.email) })
      .strict()
      .default({ ...D.notify, dash: true as const }),
    unk: z.enum(['handoff', 'call', 'custom']).default(D.unk),
    unkMsg: line(300).default(D.unkMsg),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.unk === 'custom' && !v.unkMsg) ctx.addIssue({ code: 'custom', path: ['unkMsg'], message: 'اكتب الرسالة التي سيرسلها هُدهُد' });
  });

export function parseAiConfig(raw: unknown): AiConfig {
  const r = aiConfigSchema.safeParse(raw && typeof raw === 'object' ? raw : {});
  return r.success ? (r.data as AiConfig) : (aiConfigSchema.parse({}) as AiConfig);
}

export const aiPutSchema = z.object({ config: aiConfigSchema }).strict();
export const aiPauseSchema = z.object({ duration: z.enum(['1h', 'tmr', 'manual']) }).strict();
