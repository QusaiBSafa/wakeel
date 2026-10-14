import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { calcTotals } from '@/lib/orders';
import { addDays, atMinutes, toMin, ymd } from '@/lib/time';
import type { BusinessRow } from './business';

const t = schema;

/** Demo seeding is staging-only: needs the flag, and never runs on the production Vercel environment. */
export function demoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HUDHUD_STAGING === '1' && process.env.VERCEL_ENV !== 'production';
}

type Tx = Parameters<Parameters<ReturnType<typeof db>['transaction']>[0]>[0];

/** Remove everything the seeder created (rows flagged `demo`, the stub connection, today's numbers). */
export async function removeDemo(business: BusinessRow, tx?: Tx) {
  const run = async (x: Tx) => {
    const id = business.id;
    await x.delete(t.bookings).where(and(eq(t.bookings.businessId, id), eq(t.bookings.demo, true)));
    await x.delete(t.orders).where(and(eq(t.orders.businessId, id), eq(t.orders.demo, true)));
    await x.delete(t.attentionItems).where(and(eq(t.attentionItems.businessId, id), eq(t.attentionItems.demo, true)));
    await x.delete(t.catalogItems).where(and(eq(t.catalogItems.businessId, id), eq(t.catalogItems.demo, true)));
    await x.delete(t.teamMembers).where(and(eq(t.teamMembers.businessId, id), eq(t.teamMembers.demo, true)));
    await x.delete(t.faqs).where(and(eq(t.faqs.businessId, id), eq(t.faqs.demo, true)));
    const gone = await x.delete(t.deliveryAreas).where(and(eq(t.deliveryAreas.businessId, id), eq(t.deliveryAreas.demo, true))).returning({ id: t.deliveryAreas.id });
    if (gone.length) await x.update(t.businesses).set({ freeOverMinor: null }).where(eq(t.businesses.id, id));
    await x.delete(t.whatsappConnections).where(and(eq(t.whatsappConnections.businessId, id), eq(t.whatsappConnections.isStub, true)));
    await x
      .update(t.dailyStats)
      .set({ conversations: 0, autoReplied: 0, ordersLogged: 0, bookingsConfirmed: 0, handedOff: 0, resolved: 0, messages: 0, replyMsTotal: 0, replies: 0 })
      .where(and(eq(t.dailyStats.businessId, id), eq(t.dailyStats.day, ymd(Date.now()))));
  };
  if (tx) return run(tx);
  await db().transaction(run);
}

// ---------- sample data (adapted from the design prototypes) ----------
const PRODUCTS: { name: string; price: number; desc: string; stock: number; variants?: [string, number][]; active?: boolean }[] = [
  { name: 'شامبو أرغان', price: 45, desc: 'للشعر الجاف والمصبوغ، خالي من السلفات.', stock: 24, variants: [['250 مل', 45], ['500 مل', 80]] },
  { name: 'زيت شعر طبيعي', price: 60, desc: 'زيت أرغان وجوز الهند، 100 مل.', stock: 12 },
  { name: 'ماسك كيراتين', price: 85, desc: 'علاج مكثّف بعد الصبغة، 200 مل.', stock: 3 },
  { name: 'بخاخ حماية من الحرارة', price: 55, desc: 'قبل السشوار والمكواة.', stock: 18 },
  { name: 'عطر الياسمين', price: 120, desc: 'عطر شعر وجسم.', stock: 0, variants: [['50 مل', 120], ['100 مل', 190]] },
  { name: 'مجموعة العناية بالشعر', price: 210, desc: 'شامبو + ماسك + زيت، في علبة هدية.', stock: 6 },
  { name: 'مشط خشب', price: 20, desc: '', stock: 40, active: false },
];
const SERVICES: { name: string; price: number; desc: string; dur: number; buf: number; staff: ('sara' | 'lian')[]; days: number[] }[] = [
  { name: 'قص وسشوار', price: 70, desc: 'قص حسب الطلب مع سشوار.', dur: 45, buf: 0, staff: ['sara'], days: [0, 1, 2, 3, 4, 5] },
  { name: 'صبغة شعر', price: 180, desc: 'لون واحد، شامل غسيل وسشوار.', dur: 120, buf: 15, staff: ['sara'], days: [0, 1, 2, 3, 4, 5] },
  { name: 'كيراتين', price: 350, desc: 'حسب طول الشعر، يبدأ من 350 ₪.', dur: 150, buf: 15, staff: ['sara'], days: [0, 1, 2, 3, 5] },
  { name: 'مناكير', price: 60, desc: 'تنظيف وطلاء عادي. الجل +20 ₪.', dur: 45, buf: 10, staff: ['lian'], days: [0, 1, 2, 3, 4, 5] },
  { name: 'باديكير', price: 80, desc: '', dur: 60, buf: 10, staff: ['lian'], days: [0, 1, 2, 3, 4, 5] },
  { name: 'تنظيف بشرة', price: 150, desc: 'جلسة كاملة مع ماسك.', dur: 60, buf: 15, staff: ['lian'], days: [0, 2, 4] },
  { name: 'باقة العروس', price: 900, desc: 'تسريحة ومكياج ومناكير وباديكير وتنظيف بشرة قبل العرس بأسبوع.', dur: 240, buf: 15, staff: ['sara', 'lian'], days: [0, 1, 2, 3, 4, 5] },
];
const AREAS: [string, number, string][] = [
  ['رام الله والبيرة', 15, 'في اليوم نفسه'],
  ['بيتونيا', 15, 'في اليوم نفسه'],
  ['نابلس', 25, 'يوم إلى يومي عمل'],
  ['بيت لحم', 25, 'يوم إلى يومي عمل'],
  ['الخليل', 30, '2 إلى 3 أيام عمل'],
  ['جنين', 30, '2 إلى 3 أيام عمل'],
];
const FAQS: { q: string; a: string; cat: 'general' | 'bookings' | 'prices' | 'delivery' | 'products'; on: boolean; used: number; ageDays: number; alts?: string[] }[] = [
  { q: 'ما هي ساعات العمل؟', a: 'نستقبلكم من السبت إلى الخميس، من التاسعة صباحاً حتى السابعة مساءً. يوم الجمعة عطلة.', cat: 'general', on: true, used: 31, ageDays: 3, alts: ['متى تفتحون؟', 'هل أنتم مفتوحون اليوم؟'] },
  { q: 'كيف أحجز موعداً؟', a: 'يمكنك الحجز هنا مباشرة: أخبرنا بالخدمة واليوم المناسب لك، وسنقترح عليك الأوقات المتاحة ونؤكد الموعد.', cat: 'bookings', on: true, used: 24, ageDays: 7 },
  { q: 'هل يمكنني إلغاء الموعد أو تأجيله؟', a: 'نعم، يمكنك الإلغاء أو التأجيل قبل الموعد بثلاث ساعات على الأقل. لباقة العروس عربون قدره 100 ₪ غير مسترد.', cat: 'bookings', on: true, used: 9, ageDays: 30, alts: ['أريد تأجيل موعدي'] },
  { q: 'كم سعر صبغة الشعر؟', a: 'تبدأ أسعار الصبغة من 150 ₪ للشعر القصير، ويختلف السعر حسب الطول واللون. نقدّم استشارة مجانية قبل الصبغة.', cat: 'prices', on: true, used: 17, ageDays: 2 },
  { q: 'هل توصلون المنتجات خارج رام الله؟', a: 'نعم، نوصل إلى نابلس وبيت لحم والخليل خلال يوم إلى ثلاثة أيام عمل. رسوم التوصيل من 15 إلى 30 ₪، والتوصيل مجاني للطلبات التي تزيد على 200 ₪.', cat: 'delivery', on: true, used: 12, ageDays: 7 },
  { q: 'هل المركز مخصّص للنساء فقط؟', a: 'نعم، المركز نسائي بالكامل، وجميع العاملات فيه من السيدات.', cat: 'general', on: true, used: 8, ageDays: 60 },
  { q: 'هل منتجات العناية بالشعر أصلية؟', a: 'نعم، جميع منتجاتنا أصلية ومستوردة من موزعين معتمدين، وتحمل تاريخ الإنتاج والانتهاء.', cat: 'products', on: true, used: 5, ageDays: 21 },
  { q: 'هل لديكم عروض في شهر رمضان؟', a: 'نعم، خصم 20% على جلسات العناية بالبشرة طوال شهر رمضان.', cat: 'prices', on: false, used: 0, ageDays: 180 },
];

type OrderSeed = {
  customer: string;
  phone: string;
  day: number; // days ago
  at: string;
  status: 'new' | 'confirmed' | 'preparing' | 'out' | 'delivered' | 'cancelled';
  draft?: boolean;
  source: 'ai' | 'owner';
  area: number | null; // index into AREAS, null = pickup
  address: string;
  notes?: string;
  lines: [string, string | null, number][]; // product name, variant, qty
  cancel?: 'customer';
  events: [string, string, string][]; // kind, text, actor ('ai' | 'owner' | 'customer' | 'other:<name>')
};
const ORDERS: OrderSeed[] = [
  { customer: 'تالا منصور', phone: '+970 59 520 4416', day: 2, at: '15:00', status: 'cancelled', source: 'ai', area: 0, address: 'رام الله، عين منجد', lines: [['مشط خشب', null, 1]], cancel: 'customer', events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['cancel', 'أُلغي الطلب: طلب العميل الإلغاء.', 'owner']] },
  { customer: 'نور البرغوثي', phone: '+970 59 140 6612', day: 2, at: '11:00', status: 'delivered', source: 'ai', area: 0, address: 'رام الله، الإرسال', lines: [['زيت شعر طبيعي', null, 2]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['owner', 'خرج الطلب للتوصيل', 'owner'], ['done', 'تم تسليم الطلب', 'other:شركة التوصيل']] },
  { customer: 'محمد أبو شمسية', phone: '+970 56 901 4477', day: 1, at: '14:05', status: 'out', source: 'ai', area: 2, address: 'نابلس، رفيديا، قرب جامعة النجاح', lines: [['شامبو أرغان', '250 مل', 3]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['owner', 'تم تأكيد الطلب وأُرسلت رسالة إلى العميل', 'owner'], ['owner', 'خرج الطلب للتوصيل وأُرسل إشعار إلى العميل', 'owner']] },
  { customer: 'فادي نصار', phone: '+970 59 611 0932', day: 1, at: '16:10', status: 'delivered', source: 'ai', area: null, address: 'استلام من المحل', lines: [['شامبو أرغان', '250 مل', 1], ['مشط خشب', null, 1]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['owner', 'تم تأكيد الطلب', 'owner'], ['done', 'استلم العميل الطلب من المحل', 'owner']] },
  { customer: 'رنين عابد', phone: '+970 56 788 2140', day: 1, at: '18:20', status: 'preparing', source: 'owner', area: 0, address: 'رام الله، الطيرة، شارع المدارس', notes: 'هدية، تحتاج إلى تغليف', lines: [['مجموعة العناية بالشعر', null, 1]], events: [['owner', 'أضاف الطلب', 'owner'], ['owner', 'تم تأكيد الطلب وأُرسلت رسالة إلى العميل', 'owner'], ['owner', 'بدأ تجهيز الطلب', 'other:سارة']] },
  { customer: 'سامر حداد', phone: '+970 59 233 7105', day: 0, at: '08:55', status: 'confirmed', source: 'ai', area: 3, address: 'بيت لحم، شارع المهد، قرب البلدية', lines: [['عطر الياسمين', '50 مل', 1]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['cust', 'أكّد العميل الطلب', 'customer'], ['owner', 'تم تأكيد الطلب وأُرسلت رسالة إلى العميل', 'owner']] },
  { customer: 'ليان سعادة', phone: '+970 59 402 3381', day: 0, at: '09:40', status: 'new', source: 'ai', area: 0, address: 'رام الله، الماصيون، عمارة النجمة ط3', notes: 'يرجى الاتصال قبل الوصول', lines: [['ماسك كيراتين', null, 1], ['بخاخ حماية من الحرارة', null, 1]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['cust', 'أكّد العميل الطلب والعنوان', 'customer']] },
  { customer: 'أحمد عودة', phone: '+970 56 412 9930', day: 0, at: '10:12', status: 'new', draft: true, source: 'ai', area: 0, address: 'البيرة، حي الجنان، قرب مسجد جمال عبد الناصر', lines: [['شامبو أرغان', '250 مل', 2], ['زيت شعر طبيعي', null, 1]], events: [['ai', 'سجّل هُدهُد الطلب من واتساب', 'ai'], ['wait', 'بانتظار تأكيد العميل للعنوان', 'ai']] },
];

type BookingSeed = { day: number; at: string; svc: number; name: string; phone: string; status: 'pending' | 'confirmed' | 'done' | 'cancelled'; source?: 'ai' | 'owner' };
// `day` is the prototype's weekday index with today = 4; it is shifted so that 4 means "today".
const BOOKINGS: BookingSeed[] = [
  { day: 4, at: '09:30', svc: 1, name: 'هبة زيدان', phone: '+970 59 811 2093', status: 'done' },
  { day: 4, at: '10:00', svc: 5, name: 'ريم عوض', phone: '+970 56 330 7712', status: 'done', source: 'owner' },
  { day: 4, at: '11:30', svc: 3, name: 'لينا سمارة', phone: '+970 59 702 4418', status: 'confirmed' },
  { day: 4, at: '12:00', svc: 0, name: 'جنى خليفة', phone: '+970 59 450 3307', status: 'confirmed' },
  { day: 4, at: '14:00', svc: 2, name: 'ميرا داود', phone: '+970 59 621 9054', status: 'pending' },
  { day: 4, at: '15:00', svc: 4, name: 'سلمى حجازي', phone: '+970 56 218 6640', status: 'confirmed' },
  { day: 4, at: '16:30', svc: 3, name: 'نورا شاهين', phone: '+970 59 384 1176', status: 'confirmed' },
  { day: 4, at: '17:00', svc: 0, name: 'رؤى الأحمد', phone: '+970 59 905 2281', status: 'cancelled' },
  { day: 4, at: '17:45', svc: 0, name: 'تيما عيسى', phone: '+970 59 160 7735', status: 'confirmed', source: 'owner' },
  { day: 4, at: '18:00', svc: 5, name: 'شهد يوسف', phone: '+970 59 247 8819', status: 'confirmed' },
  { day: 5, at: '10:00', svc: 0, name: 'ياسمين قرعان', phone: '+970 59 530 6621', status: 'confirmed' },
  { day: 5, at: '12:00', svc: 2, name: 'رهف الشيخ', phone: '+970 59 877 0045', status: 'pending' },
  { day: 5, at: '16:00', svc: 3, name: 'دانا حمدان', phone: '+970 59 318 7420', status: 'confirmed' },
  { day: 3, at: '11:00', svc: 1, name: 'رنا مسعد', phone: '+970 59 640 2219', status: 'done' },
  { day: 3, at: '15:00', svc: 4, name: 'ليلى ناصر', phone: '+970 56 771 0938', status: 'done' },
  { day: 2, at: '13:00', svc: 5, name: 'سما عودة', phone: '+970 59 116 5523', status: 'done' },
  { day: 0, at: '10:00', svc: 0, name: 'جود الخطيب', phone: '+970 59 821 4470', status: 'done' },
  { day: 1, at: '17:00', svc: 3, name: 'هديل سليم', phone: '+970 59 309 6618', status: 'done' },
  // referenced from the «تحتاج تدخلك» sample
  { day: 11, at: '09:00', svc: 6, name: 'ميس خليل', phone: '+970 59 734 2211', status: 'pending' },
];

const money = (n: number) => Math.round(n * 100);

/** Insert the full demo data set into the business. Idempotent: it first removes its previous run. */
export async function seedDemo(business: BusinessRow, ownerName: string) {
  const now = new Date();
  const today = ymd(now);
  const month = today.slice(0, 7);
  await db().transaction(async (tx) => {
    await removeDemo(business, tx);
    const id = business.id;

    // team
    const staff = await tx
      .insert(t.teamMembers)
      .values([
        { businessId: id, name: 'سارة', role: 'staff', status: 'pending', color: 1, providesServices: true, demo: true },
        { businessId: id, name: 'ليان', role: 'staff', status: 'pending', color: 4, providesServices: true, demo: true },
      ])
      .returning();
    const member = { sara: staff[0].id, lian: staff[1].id };

    // hours: Saturday–Thursday 09:00–19:00 with a 13:00–14:00 break, Friday closed
    for (let weekday = 0; weekday < 7; weekday++) {
      const v = { open: weekday !== 6, openMin: 540, closeMin: 1140, breakStartMin: 780, breakEndMin: 840 };
      await tx.insert(t.businessHours).values({ businessId: id, weekday, ...v }).onConflictDoUpdate({ target: [t.businessHours.businessId, t.businessHours.weekday], set: v });
    }

    // catalog
    const prodRows = await tx
      .insert(t.catalogItems)
      .values(
        PRODUCTS.map((p, i) => ({
          businessId: id,
          kind: 'product' as const,
          name: p.name,
          description: p.desc,
          priceMinor: money(p.price),
          variants: (p.variants ?? []).map(([name, price]) => ({ name, priceMinor: money(price) })),
          stockMode: p.stock === 0 ? ('out' as const) : ('qty' as const),
          stockQty: p.stock,
          active: p.active !== false,
          position: i,
          demo: true,
        })),
      )
      .returning();
    const svcRows = await tx
      .insert(t.catalogItems)
      .values(
        SERVICES.map((s, i) => ({
          businessId: id,
          kind: 'service' as const,
          name: s.name,
          description: s.desc,
          priceMinor: money(s.price),
          durationMin: s.dur,
          bufferMin: s.buf,
          days: s.days,
          position: PRODUCTS.length + i,
          demo: true,
        })),
      )
      .returning();
    await tx.insert(t.serviceStaff).values(svcRows.flatMap((r, i) => SERVICES[i].staff.map((s) => ({ itemId: r.id, memberId: member[s] }))));
    const prodByName = new Map(prodRows.map((p) => [p.name, p]));

    // delivery
    const areaRows = await tx
      .insert(t.deliveryAreas)
      .values(AREAS.map(([name, fee, eta], i) => ({ businessId: id, name, feeMinor: money(fee), eta, position: i, demo: true })))
      .returning();
    await tx.update(t.businesses).set({ deliveryEnabled: true, freeOverMinor: 20000 }).where(eq(t.businesses.id, id));

    // FAQs
    await tx.insert(t.faqs).values(
      FAQS.map((f, i) => {
        const when = new Date(now.getTime() - f.ageDays * 86400000);
        return { businessId: id, question: f.q, answer: f.a, category: f.cat, enabled: f.on, alts: f.alts ?? [], usageMonth: month, usageCount: f.used, position: i, demo: true, createdAt: when, updatedAt: when };
      }),
    );

    // orders (numbers continue the business counter so they never clash with real orders)
    let orderNo = business.nextOrderNo;
    const orderNumbers: number[] = [];
    for (const o of ORDERS) {
      const number = orderNo++;
      orderNumbers.push(number);
      const lines = o.lines.map(([name, variant, qty], pos) => {
        const p = prodByName.get(name)!;
        const v = variant ? p.variants.find((x) => x.name === variant) : undefined;
        return { itemId: p.id, name: variant ? `${name} · ${variant}` : name, unitPriceMinor: v ? v.priceMinor : p.priceMinor, qty, position: pos };
      });
      const area = o.area === null ? null : areaRows[o.area];
      const totals = calcTotals(lines, area ? { feeMinor: area.feeMinor } : null, o.area === null, 20000);
      const created = atMinutes(addDays(today, -o.day), toMin(o.at));
      const createdAt = created.getTime() > now.getTime() - 60000 ? new Date(now.getTime() - (ORDERS.length - orderNumbers.length + 1) * 7 * 60000) : created;
      const [row] = await tx
        .insert(t.orders)
        .values({
          businessId: id,
          number,
          customerName: o.customer,
          customerPhone: o.phone,
          status: o.status,
          isDraft: !!o.draft,
          source: o.source,
          pickup: o.area === null,
          areaId: area?.id ?? null,
          areaName: area?.name ?? '',
          address: o.address,
          notes: o.notes ?? '',
          subtotalMinor: totals.subtotal,
          deliveryFeeMinor: totals.fee,
          totalMinor: totals.total,
          cancelReason: o.cancel ?? null,
          deliveredAt: o.status === 'delivered' ? new Date(createdAt.getTime() + 3 * 3600000) : null,
          demo: true,
          createdAt,
          updatedAt: createdAt,
        })
        .returning();
      await tx.insert(t.orderItems).values(lines.map((l) => ({ ...l, orderId: row.id })));
      await tx.insert(t.orderEvents).values(
        o.events.map(([kind, text, who], k) => ({
          orderId: row.id,
          kind,
          text: kind === 'owner' && text === 'أضاف الطلب' ? `${ownerName} أضاف الطلب` : text,
          actorName: who === 'ai' ? 'هُدهُد' : who === 'customer' ? 'العميل' : who === 'owner' ? ownerName : who.replace('other:', ''),
          createdAt: new Date(createdAt.getTime() + k * 60000),
        })),
      );
    }
    const delayed = orderNumbers[2]; // محمد أبو شمسية: out for delivery
    const delayedId = (await tx.select({ id: t.orders.id }).from(t.orders).where(and(eq(t.orders.businessId, id), eq(t.orders.number, delayed))).limit(1))[0]?.id;

    // bookings
    let bookingNo = business.nextBookingNo;
    let brideId: string | null = null;
    for (const b of BOOKINGS) {
      const svc = SERVICES[b.svc];
      const svcRow = svcRows[b.svc];
      const date = addDays(today, b.day - 4);
      const startsAt = atMinutes(date, toMin(b.at));
      const endsAt = new Date(startsAt.getTime() + svc.dur * 60000);
      const number = bookingNo++;
      const [row] = await tx
        .insert(t.bookings)
        .values({
          businessId: id,
          number,
          customerName: b.name,
          customerPhone: b.phone,
          itemId: svcRow.id,
          serviceName: svc.name,
          priceMinor: money(svc.price),
          durationMin: svc.dur,
          bufferMin: svc.buf,
          memberId: member[svc.staff[0]],
          startsAt,
          endsAt,
          blockedUntil: new Date(endsAt.getTime() + svc.buf * 60000),
          status: b.status,
          source: b.source ?? 'ai',
          cancelledAt: b.status === 'cancelled' ? now : null,
          demo: true,
        })
        .returning({ id: t.bookings.id });
      if (b.svc === 6) {
        brideId = row.id;
      }
    }

    // attention (no message content: only the reason, the phone and a suggestion)
    await tx.insert(t.attentionItems).values([
      {
        businessId: id,
        customerName: 'محمد أبو شمسية',
        customerPhone: '+970 56 901 4477',
        reason: `شكوى على تأخر الطلب #${delayed}. تُحوَّل الشكاوى إليك حسب إعداداتك.`,
        refKind: 'order',
        refId: delayedId ?? null,
        suggestion: 'معك حق ونعتذر منك. سيصلك الطلب اليوم قبل الساعة 4:00، والتوصيل على حسابنا.',
        demo: true,
        createdAt: new Date(now.getTime() - 25 * 60000),
      },
      {
        businessId: id,
        customerName: 'ميس خليل',
        customerPhone: '+970 59 734 2211',
        reason: 'طلبت خصماً بنسبة 20% على باقة العروس، والخصومات ليست من صلاحيات هُدهُد.',
        refKind: brideId ? 'booking' : null,
        refId: brideId,
        suggestion: 'يمكننا منحك خصماً بنسبة 10% إذا أكّدت الحجز اليوم، ليصبح سعر الباقة 810 ₪.',
        demo: true,
        createdAt: new Date(now.getTime() - 12 * 60000),
      },
      {
        businessId: id,
        customerName: 'حلا جرار',
        customerPhone: '+970 59 220 8813',
        reason: 'سألت عن منتج غير موجود في قائمة منتجاتك (كريم كيراتين للأطفال).',
        suggestion: 'لا يتوفر لدينا كريم كيراتين للأطفال حالياً، لكن لدينا شامبو أرغان لطيف يناسب الأطفال بسعر 45 ₪.',
        demo: true,
        createdAt: new Date(now.getTime() - 4 * 60000),
      },
    ]);

    await tx.update(t.businesses).set({ nextOrderNo: orderNo, nextBookingNo: bookingNo }).where(eq(t.businesses.id, id));

    // today's numbers
    const stats = { conversations: 47, autoReplied: 44, ordersLogged: 4, bookingsConfirmed: 5, handedOff: 3, resolved: 5, messages: 312, replies: 44, replyMsTotal: 264000 };
    await tx
      .insert(t.dailyStats)
      .values({ businessId: id, day: today, ...stats })
      .onConflictDoUpdate({ target: [t.dailyStats.businessId, t.dailyStats.day], set: stats });

    // stub WhatsApp connection (kept if a real one exists)
    const wa = {
      status: 'connected' as const,
      phone: business.phone || '+970 59 812 3344',
      displayName: business.name,
      connectedAt: new Date(now.getTime() - 30 * 86400000),
      tokenExpiresAt: new Date(now.getTime() + 55 * 86400000),
      disconnectedAt: null,
      quality: 'good',
      lastReplyAt: new Date(now.getTime() - 2 * 60000),
      isStub: true,
    };
    await tx.insert(t.whatsappConnections).values({ businessId: id, ...wa }).onConflictDoNothing();
  });
}
