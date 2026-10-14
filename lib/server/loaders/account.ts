import 'server-only';
import { and, count, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { PLAN } from '@/lib/constants';
import type { BusinessRow } from '../business';
import { businessInfoDTO, waDTO } from '../dto';
import { monthSum } from '../stats';
import { membersFor } from './shared';

const { whatsappConnections, catalogItems } = schema;

export async function loadAccount(business: BusinessRow) {
  const d = db();
  const [[wa], members, conversations, [items]] = await Promise.all([
    d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1),
    membersFor(business.id),
    monthSum(business.id, 'conversations'),
    d.select({ n: count() }).from(catalogItems).where(and(eq(catalogItems.businessId, business.id), isNull(catalogItems.deletedAt))),
  ]);
  const messages = await monthSum(business.id, 'messages');
  return {
    info: businessInfoDTO(business),
    wa: waDTO(wa),
    members,
    plan: { ...PLAN },
    usage: { conversations, members: members.length, items: items?.n ?? 0 },
    messagesThisMonth: messages,
    now: new Date().toISOString(),
  };
}
export type AccountData = Awaited<ReturnType<typeof loadAccount>>;
