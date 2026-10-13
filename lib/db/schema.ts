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

export const categoryEnum = pgEnum('business_category', ['clinic', 'salon', 'restaurant', 'shop', 'other']);
export const hoursModeEnum = pgEnum('hours_mode', ['booking', 'custom']);
export const currencyEnum = pgEnum('currency', ['ILS', 'JOD', 'USD', 'SAR', 'AED', 'EGP']);
export const faqStatusEnum = pgEnum('faq_status', ['open', 'answered', 'skipped']);

export type Socials = { instagram?: string; facebook?: string; tiktok?: string; website?: string };
export type Delivery = { enabled: boolean; areas?: string; feeMinor?: number | null; time?: string };

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerUserId: text('owner_user_id').notNull().unique(),
  name: text('name').notNull(),
  category: categoryEnum('category').notNull().default('other'),
  description: text('description').notNull().default(''),
  logoUrl: text('logo_url'),
  logoPathname: text('logo_pathname'),
  address: text('address').notNull().default(''),
  mapUrl: text('map_url').notNull().default(''),
  phone: text('phone').notNull().default(''),
  socials: jsonb('socials').$type<Socials>().notNull().default({}),
  paymentMethods: text('payment_methods').array().notNull().default(sql`'{}'::text[]`),
  delivery: jsonb('delivery').$type<Delivery>().notNull().default({ enabled: false }),
  hoursMode: hoursModeEnum('hours_mode').notNull().default('booking'),
  hoursText: text('hours_text').notNull().default(''),
  onboardingStep: smallint('onboarding_step').notNull().default(0),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  ...timestamps,
});

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    priceMinor: integer('price_minor').notNull(),
    currency: currencyEnum('currency').notNull().default('ILS'),
    description: text('description').notNull().default(''),
    imageUrl: text('image_url'),
    imagePathname: text('image_pathname'),
    // soft delete so "undo" can bring a product back with its photo; purged a few minutes later
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('products_business_sku_uq').on(t.businessId, sql`lower(${t.sku})`).where(sql`${t.deletedAt} is null`),
    index('products_business_idx').on(t.businessId),
    check('products_price_positive', sql`${t.priceMinor} > 0`),
  ],
);

export const bookingSettings = pgTable(
  'booking_settings',
  {
    businessId: uuid('business_id')
      .primaryKey()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(false),
    slotMinutes: smallint('slot_minutes').notNull().default(30),
    bufferMinutes: smallint('buffer_minutes').notNull().default(0),
    timezone: text('timezone').notNull().default('Asia/Hebron'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('booking_slot_range', sql`${t.slotMinutes} between 5 and 480`),
    check('booking_buffer_range', sql`${t.bufferMinutes} between 0 and 120`),
  ],
);

// weekday: 0 = Saturday … 6 = Friday (the order shown in the UI)
export const availability = pgTable(
  'availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    startMin: smallint('start_min').notNull(),
    endMin: smallint('end_min').notNull(),
  },
  (t) => [
    index('availability_business_idx').on(t.businessId, t.weekday),
    check('availability_weekday', sql`${t.weekday} between 0 and 6`),
    check('availability_range', sql`${t.startMin} >= 0 and ${t.endMin} <= 1440 and ${t.endMin} > ${t.startMin}`),
  ],
);

// days the business opens at all; ranges for a closed day are kept so re-opening restores them
export const openDays = pgTable(
  'open_days',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    weekday: smallint('weekday').notNull(),
    open: boolean('open').notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.weekday] })],
);

export const closures = pgTable(
  'closures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    note: text('note').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('closures_business_date_uq').on(t.businessId, t.date)],
);

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    templateKey: text('template_key'),
    question: text('question').notNull(),
    answer: text('answer').notNull().default(''),
    status: faqStatusEnum('status').notNull().default('open'),
    position: integer('position').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('faqs_business_idx').on(t.businessId, t.position),
    uniqueIndex('faqs_business_template_uq').on(t.businessId, t.templateKey),
  ],
);

export const notifyRequests = pgTable(
  'notify_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    feature: text('feature').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('notify_business_feature_uq').on(t.businessId, t.feature)],
);

export type Business = typeof businesses.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
