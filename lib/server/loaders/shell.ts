import 'server-only';
import { and, count, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { doneCount, STEP_COUNT } from '@/lib/onboarding';
import { colorOf } from '@/lib/color';
import type { ShellData } from '@/lib/types';
import type { BusinessRow } from '../business';
import { aiEffective } from '../ai';
import { waState } from '../dto';

const { attentionItems, orders, aiSettings, whatsappConnections } = schema;

export async function loadShell(business: BusinessRow, ownerName: string): Promise<ShellData> {
  const d = db();
  const [[wa], [attn], [newOrders], [ai]] = await Promise.all([
    d.select().from(whatsappConnections).where(eq(whatsappConnections.businessId, business.id)).limit(1),
    d.select({ n: count() }).from(attentionItems).where(eq(attentionItems.businessId, business.id)),
    d.select({ n: count() }).from(orders).where(and(eq(orders.businessId, business.id), eq(orders.status, 'new'))),
    d.select().from(aiSettings).where(eq(aiSettings.businessId, business.id)).limit(1),
  ]);
  const ob = business.onboarding;
  const done = doneCount({
    maxStep: ob.maxStep,
    skipped: ob.skipped,
    waConnected: wa?.status === 'connected',
    delivery: business.offers.delivery,
    activated: !!business.onboardedAt,
  });
  return {
    business: {
      id: business.id,
      name: business.name,
      initial: Array.from(business.name.trim())[0] || '؟',
      color: colorOf(business.id),
      type: business.type,
      offers: business.offers,
      sections: business.sections,
      onboardingDone: !!business.onboardedAt,
      onboardingProgress: { done, total: STEP_COUNT },
    },
    owner: { name: ownerName },
    wa: waState(wa),
    counts: { attention: attn?.n ?? 0, newOrders: newOrders?.n ?? 0 },
    aiEnabled: aiEffective(ai),
    staging: process.env.NEXT_PUBLIC_HUDHUD_STAGING === '1',
  };
}
