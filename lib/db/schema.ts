import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  smallint,
  date,
  uniqueIndex,
  index,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Things Drizzle cannot express live in drizzle/0002_v2_data.sql: the btree_gist extension and the
// `bookings_no_overlap` exclusion constraint on bookings.

export const currencyEnum = pgEnum('currency', ['ILS', 'JOD', 'USD', 'SAR', 'AED', 'EGP']);

export const businessTypeEnum = pgEnum('business_type', ['salon', 'food', 'clothes', 'clinic', 'tech', 'other']);
export const itemKindEnum = pgEnum('item_kind', ['product', 'service']);
export const stockModeEnum = pgEnum('stock_mode', ['always', 'qty', 'out']);
export const orderStatusEnum = pgEnum('order_status', ['new', 'confirmed', 'preparing', 'out', 'delivered', 'cancelled']);
export const orderCancelReasonEnum = pgEnum('order_cancel_reason', ['customer', 'stock', 'area', 'other']);
export const actorEnum = pgEnum('actor', ['ai', 'owner', 'customer', 'system']);
export const bookingStatusEnum = pgEnum('booking_status', ['pending', 'confirmed', 'done', 'cancelled']);
export const teamRoleEnum = pgEnum('team_role', ['owner', 'admin', 'staff', 'book']);
export const memberStatusEnum = pgEnum('member_status', ['active', 'pending']);
export const waStatusEnum = pgEnum('wa_status', ['connected', 'needs_attention', 'disconnected']);
export const faqCategoryEnum = pgEnum('faq_category', ['general', 'bookings', 'prices', 'delivery', 'products']);
export const afterHoursEnum = pgEnum('after_hours', ['reply', 'away']);

export type Socials = { instagram?: string; facebook?: string; tiktok?: string; website?: string };
export type Offers = { products: boolean; services: boolean; delivery: boolean };
export type Sections = { orders: boolean; bookings: boolean; products: boolean; services: boolean; delivery: boolean };
export type SectionUpdated = Partial<Record<'basic' | 'location' | 'contact' | 'policy' | 'delivery' | 'hours', string>>;
export type OnboardingState = { step: number; maxStep: number; skipped: number[]; rowIds?: string[] };
export type Variant = { name: string; priceMinor: number };

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

const businessRef = () =>
  uuid('business_id')
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' });

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: text('owner_user_id').notNull().unique(),
  name: text('name').notNull().default(''),
  type: businessTypeEnum('type').notNull().default('other'),
  offers: jsonb('offers').$type<Offers>().notNull().default({ products: true, services: false, delivery: false }),
  description: text('description').notNull().default(''),
  logoUrl: text('logo_url'),
  logoPathname: text('logo_pathname'),
  city: text('city').notNull().default(''),
  address: text('address').notNull().default(''),
  landmark: text('landmark').notNull().default(''),
  parking: text('parking').notNull().default(''),
  mapUrl: text('map_url').notNull().default(''),
  phone: text('phone').notNull().default(''),
  socials: jsonb('socials').$type<Socials>().notNull().default({}),
  returnsPolicy: text('returns_policy').notNull().default(''),
  cancelPolicy: text('cancel_policy').notNull().default(''),
  rules: text('rules').array().notNull().default(sql`'{}'::text[]`),
  deliveryEnabled: boolean('delivery_enabled').notNull().default(false),
  freeOverMinor: integer('free_over_minor'),
  sections: jsonb('sections')
    .$type<Sections>()
    .notNull()
    .default({ orders: true, bookings: true, products: true, services: true, delivery: true }),
  afterHours: afterHoursEnum('after_hours').notNull().default('reply'),
  sectionUpdated: jsonb('section_updated').$type<SectionUpdated>().notNull().default({}),
  onboarding: jsonb('onboarding').$type<OnboardingState>().notNull().default({ step: 1, maxStep: 1, skipped: [] }),
  dismissedFaqSuggestions: text('dismissed_faq_suggestions').array().notNull().default(sql`'{}'::text[]`),
  nextOrderNo: integer('next_order_no').notNull().default(1001),
  nextBookingNo: integer('next_booking_no').notNull().default(101),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  ...timestamps,
});

export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    clerkUserId: text('clerk_user_id'),
    name: text('name').notNull(),
    phone: text('phone').notNull().default(''),
    email: text('email').notNull().default(''),
    role: teamRoleEnum('role').notNull(),
    status: memberStatusEnum('status').notNull().default('active'),
    color: smallint('color').notNull().default(0),
    providesServices: boolean('provides_services').notNull().default(true),
    demo: boolean('demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('team_members_business_idx').on(t.businessId),
    uniqueIndex('team_members_clerk_uq').on(t.clerkUserId).where(sql`${t.clerkUserId} is not null`),
    check('team_members_color', sql`${t.color} between 0 and 7`),
  ],
);

// The table keeps its old name; in code it is the catalog (products and services).
export const catalogItems = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    kind: itemKindEnum('kind').notNull().default('product'),
    name: text('name').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: currencyEnum('currency').notNull().default('ILS'),
    description: text('description').notNull().default(''),
    imageUrl: text('image_url'),
    imagePathname: text('image_pathname'),
    variants: jsonb('variants').$type<Variant[]>().notNull().default([]),
    stockMode: stockModeEnum('stock_mode').notNull().default('always'),
    stockQty: integer('stock_qty'),
    active: boolean('active').notNull().default(true),
    durationMin: smallint('duration_min'),
    bufferMin: smallint('buffer_min').notNull().default(0),
    days: smallint('days').array().notNull().default(sql`'{0,1,2,3,4,5,6}'::smallint[]`),
    position: integer('position').notNull().default(0),
    demo: boolean('demo').notNull().default(false),
    // soft delete so "undo" can bring an item back with its photo; purged a few minutes later
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('products_business_idx').on(t.businessId),
    check('products_price_positive', sql`${t.priceMinor} > 0`),
    check('products_service_duration', sql`${t.kind} <> 'service' or ${t.durationMin} between 5 and 480`),
  ],
);

export const serviceStaff = pgTable(
  'service_staff',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => catalogItems.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.memberId] })],
);

export const bookingSettings = pgTable(
  'booking_settings',
  {
    businessId: uuid('business_id')
      .primaryKey()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    leadMinutes: smallint('lead_minutes').notNull().default(120),
    horizonDays: smallint('horizon_days').notNull().default(30),
    autoConfirm: boolean('auto_confirm').notNull().default(true),
    timezone: text('timezone').notNull().default('Asia/Hebron'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
  ],
);

// weekday: 0 = Saturday … 6 = Friday (the order shown in the UI)
export const businessHours = pgTable(
  'business_hours',
  {
    businessId: businessRef(),
    weekday: smallint('weekday').notNull(),
    open: boolean('open').notNull().default(true),
    openMin: smallint('open_min').notNull().default(540),
    closeMin: smallint('close_min').notNull().default(1020),
    breakStartMin: smallint('break_start_min'),
    breakEndMin: smallint('break_end_min'),
  },
  (t) => [
    primaryKey({ columns: [t.businessId, t.weekday] }),
    check('business_hours_weekday', sql`${t.weekday} between 0 and 6`),
    check('business_hours_range', sql`${t.closeMin} > ${t.openMin}`),
    check(
      'business_hours_break',
      sql`(${t.breakStartMin} is null and ${t.breakEndMin} is null) or (${t.breakStartMin} is not null and ${t.breakEndMin} is not null and ${t.openMin} <= ${t.breakStartMin} and ${t.breakStartMin} < ${t.breakEndMin} and ${t.breakEndMin} <= ${t.closeMin})`,
    ),
  ],
);

export const closures = pgTable(
  'closures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    date: date('date').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('closures_business_date_uq').on(t.businessId, t.date)],
);

export const staffLeaves = pgTable(
  'staff_leaves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => teamMembers.id, { onDelete: 'cascade' }),
    fromDate: date('from_date').notNull(),
    toDate: date('to_date').notNull(),
    note: text('note').notNull().default(''),
  },
  (t) => [index('staff_leaves_business_idx').on(t.businessId), check('staff_leaves_range', sql`${t.toDate} >= ${t.fromDate}`)],
);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    number: integer('number').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    itemId: uuid('item_id').references(() => catalogItems.id, { onDelete: 'set null' }),
    serviceName: text('service_name').notNull(),
    priceMinor: integer('price_minor').notNull(),
    durationMin: smallint('duration_min').notNull(),
    bufferMin: smallint('buffer_min').notNull().default(0),
    memberId: uuid('member_id').references(() => teamMembers.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }).notNull(),
    status: bookingStatusEnum('status').notNull(),
    source: actorEnum('source').notNull(),
    demo: boolean('demo').notNull().default(false),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('bookings_business_number_uq').on(t.businessId, t.number),
    index('bookings_business_starts_idx').on(t.businessId, t.startsAt),
    check('bookings_time_order', sql`${t.endsAt} > ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`),
  ],
);

export const deliveryAreas = pgTable(
  'delivery_areas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    name: text('name').notNull(),
    feeMinor: integer('fee_minor').notNull().default(0),
    eta: text('eta').notNull(),
    position: integer('position').notNull().default(0),
    demo: boolean('demo').notNull().default(false),
  },
  (t) => [index('delivery_areas_business_idx').on(t.businessId, t.position)],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    number: integer('number').notNull(),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    status: orderStatusEnum('status').notNull().default('new'),
    isDraft: boolean('is_draft').notNull().default(false),
    source: actorEnum('source').notNull(),
    pickup: boolean('pickup').notNull().default(false),
    areaId: uuid('area_id').references(() => deliveryAreas.id, { onDelete: 'set null' }),
    areaName: text('area_name').notNull().default(''),
    address: text('address').notNull().default(''),
    notes: text('notes').notNull().default(''),
    subtotalMinor: integer('subtotal_minor').notNull().default(0),
    deliveryFeeMinor: integer('delivery_fee_minor').notNull().default(0),
    totalMinor: integer('total_minor').notNull().default(0),
    cancelReason: orderCancelReasonEnum('cancel_reason'),
    demo: boolean('demo').notNull().default(false),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('orders_business_number_uq').on(t.businessId, t.number), index('orders_business_created_idx').on(t.businessId, t.createdAt.desc())],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => catalogItems.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    qty: smallint('qty').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), check('order_items_qty', sql`${t.qty} between 1 and 99`)],
);

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    text: text('text').notNull(),
    actorName: text('actor_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_idx').on(t.orderId, t.createdAt)],
);

// No message content and no reply text are stored. Resolving an item deletes the row.
export const attentionItems = pgTable(
  'attention_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    customerName: text('customer_name').notNull().default(''),
    customerPhone: text('customer_phone').notNull(),
    reason: text('reason').notNull(),
    refKind: text('ref_kind'),
    refId: uuid('ref_id'),
    suggestion: text('suggestion'),
    status: text('status').notNull().default('open'),
    hodhodPaused: boolean('hodhod_paused').notNull().default(false),
    demo: boolean('demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('attention_business_idx').on(t.businessId, t.createdAt)],
);

// Numbers only.
export const dailyStats = pgTable(
  'daily_stats',
  {
    businessId: businessRef(),
    day: date('day').notNull(),
    conversations: integer('conversations').notNull().default(0),
    autoReplied: integer('auto_replied').notNull().default(0),
    ordersLogged: integer('orders_logged').notNull().default(0),
    bookingsConfirmed: integer('bookings_confirmed').notNull().default(0),
    handedOff: integer('handed_off').notNull().default(0),
    resolved: integer('resolved').notNull().default(0),
    messages: integer('messages').notNull().default(0),
    replyMsTotal: integer('reply_ms_total').notNull().default(0),
    replies: integer('replies').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.day] })],
);

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: businessRef(),
    templateKey: text('template_key'),
    question: text('question').notNull(),
    answer: text('answer').notNull().default(''),
    category: faqCategoryEnum('category').notNull().default('general'),
    enabled: boolean('enabled').notNull().default(true),
    alts: text('alts').array().notNull().default(sql`'{}'::text[]`),
    usageMonth: text('usage_month').notNull().default(''),
    usageCount: integer('usage_count').notNull().default(0),
    position: integer('position').notNull().default(0),
    demo: boolean('demo').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('faqs_business_idx').on(t.businessId, t.position),
    uniqueIndex('faqs_business_template_uq').on(t.businessId, t.templateKey),
  ],
);

export const aiSettings = pgTable('ai_settings', {
  businessId: uuid('business_id')
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  pausedUntil: timestamp('paused_until', { withTimezone: true }),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const whatsappConnections = pgTable('whatsapp_connections', {
  businessId: uuid('business_id')
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  status: waStatusEnum('status').notNull(),
  phone: text('phone').notNull().default(''),
  displayName: text('display_name').notNull().default(''),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
  quality: text('quality').notNull().default('good'),
  lastReplyAt: timestamp('last_reply_at', { withTimezone: true }),
  isStub: boolean('is_stub').notNull().default(true),
});

export type Business = typeof businesses.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
