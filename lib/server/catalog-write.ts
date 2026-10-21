import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { z } from 'zod';
import type { catalogCreateSchema, catalogPatchSchema } from '@/lib/validation/catalog';
import { HttpError } from './api';
import { deleteBlob, verifyOwnedBlob } from './media';
import { itemDTO } from './dto';
import type { CatalogItemDTO } from '@/lib/types';

const t = schema;
type Create = z.output<typeof catalogCreateSchema>;
type Patch = z.output<typeof catalogPatchSchema>;

async function checkStaff(businessId: string, ids: string[]) {
  if (!ids.length) return;
  const rows = await db().select({ id: t.teamMembers.id }).from(t.teamMembers).where(and(eq(t.teamMembers.businessId, businessId), inArray(t.teamMembers.id, ids)));
  if (rows.length !== new Set(ids).size) throw new HttpError(400, 'البيانات غير صحيحة');
}

const variantsOf = (v: { name: string; price: number }[] | undefined) => (v ?? []).map((x) => ({ name: x.name, priceMinor: x.price }));

export async function createItem(userId: string, businessId: string, b: Create): Promise<CatalogItemDTO> {
  await checkStaff(businessId, b.staffIds ?? []);
  if (b.image) await verifyOwnedBlob('products', userId, b.image);
  const isService = b.kind === 'service';
  const d = db();
  const [min] = await d.select({ m: sql<number>`coalesce(min(${t.catalogItems.position}), 0)::int` }).from(t.catalogItems).where(eq(t.catalogItems.businessId, businessId));
  const row = await d.transaction(async (tx) => {
    const [r] = await tx
      .insert(t.catalogItems)
      .values({
        businessId,
        kind: b.kind,
        name: b.name,
        description: b.description ?? '',
        priceMinor: b.price,
        variants: isService ? [] : variantsOf(b.variants),
        stockMode: isService ? 'always' : b.stockMode ?? 'always',
        stockQty: !isService && b.stockMode === 'qty' ? b.stockQty ?? 0 : null,
        active: b.active ?? true,
        durationMin: isService ? b.durationMin ?? null : null,
        days: isService ? b.days ?? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6],
        imageUrl: b.image?.url ?? null,
        imagePathname: b.image?.pathname ?? null,
        position: (min?.m ?? 0) - 1,
      })
      .returning();
    if (isService && b.staffIds?.length) await tx.insert(t.serviceStaff).values(b.staffIds.map((m) => ({ itemId: r.id, memberId: m })));
    return r;
  });
  return itemDTO(row, isService ? b.staffIds ?? [] : []);
}

export async function patchItem(userId: string, businessId: string, current: typeof t.catalogItems.$inferSelect, b: Patch): Promise<CatalogItemDTO> {
  const isService = current.kind === 'service';
  if (b.staffIds) await checkStaff(businessId, b.staffIds);
  if (b.image) await verifyOwnedBlob('products', userId, b.image);
  if (b.stockMode === 'qty' && (b.stockQty === undefined || b.stockQty === null) && current.stockQty === null) throw new HttpError(400, 'هذا الحقل مطلوب');
  const set: Partial<typeof t.catalogItems.$inferInsert> = { updatedAt: new Date() };
  if (b.name !== undefined) set.name = b.name;
  if (b.description !== undefined) set.description = b.description;
  if (b.price !== undefined) set.priceMinor = b.price;
  if (b.active !== undefined) set.active = b.active;
  if (!isService) {
    if (b.variants !== undefined) set.variants = variantsOf(b.variants);
    if (b.stockMode !== undefined) {
      set.stockMode = b.stockMode;
      set.stockQty = b.stockMode === 'qty' ? b.stockQty ?? current.stockQty ?? 0 : null;
    } else if (b.stockQty !== undefined && current.stockMode === 'qty') set.stockQty = b.stockQty;
  } else {
    if (b.durationMin !== undefined) set.durationMin = b.durationMin;
    if (b.days !== undefined) set.days = b.days;
  }
  if (b.image !== undefined) {
    set.imageUrl = b.image?.url ?? null;
    set.imagePathname = b.image?.pathname ?? null;
  }
  const d = db();
  const row = await d.transaction(async (tx) => {
    const [r] = await tx.update(t.catalogItems).set(set).where(and(eq(t.catalogItems.id, current.id), eq(t.catalogItems.businessId, businessId))).returning();
    if (isService && b.staffIds) {
      await tx.delete(t.serviceStaff).where(eq(t.serviceStaff.itemId, current.id));
      if (b.staffIds.length) await tx.insert(t.serviceStaff).values(b.staffIds.map((m) => ({ itemId: current.id, memberId: m })));
    }
    return r;
  });
  if (b.image !== undefined && current.imageUrl && current.imageUrl !== (b.image?.url ?? null)) await deleteBlob(current.imageUrl);
  const links = await d.select({ m: t.serviceStaff.memberId }).from(t.serviceStaff).where(eq(t.serviceStaff.itemId, current.id));
  return itemDTO(row, links.map((l) => l.m));
}

export async function staffIdsOf(itemId: string): Promise<string[]> {
  const links = await db().select({ m: t.serviceStaff.memberId }).from(t.serviceStaff).where(eq(t.serviceStaff.itemId, itemId));
  return links.map((l) => l.m);
}
