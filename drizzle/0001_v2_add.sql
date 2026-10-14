CREATE TYPE "public"."actor" AS ENUM('ai', 'owner', 'customer', 'system');--> statement-breakpoint
CREATE TYPE "public"."after_hours" AS ENUM('reply', 'away');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."business_type" AS ENUM('salon', 'food', 'clothes', 'clinic', 'tech', 'other');--> statement-breakpoint
CREATE TYPE "public"."faq_category" AS ENUM('general', 'bookings', 'prices', 'delivery', 'products');--> statement-breakpoint
CREATE TYPE "public"."item_kind" AS ENUM('product', 'service');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'pending');--> statement-breakpoint
CREATE TYPE "public"."order_cancel_reason" AS ENUM('customer', 'stock', 'area', 'other');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'confirmed', 'preparing', 'out', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_mode" AS ENUM('always', 'qty', 'out');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('owner', 'admin', 'staff', 'book');--> statement-breakpoint
CREATE TYPE "public"."wa_status" AS ENUM('connected', 'needs_attention', 'disconnected');--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"paused_until" timestamp with time zone,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attention_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"customer_phone" text NOT NULL,
	"reason" text NOT NULL,
	"ref_kind" text,
	"ref_id" uuid,
	"suggestion" text,
	"status" text DEFAULT 'open' NOT NULL,
	"hodhod_paused" boolean DEFAULT false NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"item_id" uuid,
	"service_name" text NOT NULL,
	"price_minor" integer NOT NULL,
	"duration_min" smallint NOT NULL,
	"buffer_min" smallint DEFAULT 0 NOT NULL,
	"member_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"blocked_until" timestamp with time zone NOT NULL,
	"status" "booking_status" NOT NULL,
	"source" "actor" NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_time_order" CHECK ("bookings"."ends_at" > "bookings"."starts_at" and "bookings"."blocked_until" >= "bookings"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"business_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"open_min" smallint DEFAULT 540 NOT NULL,
	"close_min" smallint DEFAULT 1020 NOT NULL,
	"break_start_min" smallint,
	"break_end_min" smallint,
	CONSTRAINT "business_hours_business_id_weekday_pk" PRIMARY KEY("business_id","weekday"),
	CONSTRAINT "business_hours_weekday" CHECK ("business_hours"."weekday" between 0 and 6),
	CONSTRAINT "business_hours_range" CHECK ("business_hours"."close_min" > "business_hours"."open_min"),
	CONSTRAINT "business_hours_break" CHECK (("business_hours"."break_start_min" is null and "business_hours"."break_end_min" is null) or ("business_hours"."break_start_min" is not null and "business_hours"."break_end_min" is not null and "business_hours"."open_min" <= "business_hours"."break_start_min" and "business_hours"."break_start_min" < "business_hours"."break_end_min" and "business_hours"."break_end_min" <= "business_hours"."close_min"))
);
--> statement-breakpoint
CREATE TABLE "daily_stats" (
	"business_id" uuid NOT NULL,
	"day" date NOT NULL,
	"conversations" integer DEFAULT 0 NOT NULL,
	"auto_replied" integer DEFAULT 0 NOT NULL,
	"orders_logged" integer DEFAULT 0 NOT NULL,
	"bookings_confirmed" integer DEFAULT 0 NOT NULL,
	"handed_off" integer DEFAULT 0 NOT NULL,
	"resolved" integer DEFAULT 0 NOT NULL,
	"messages" integer DEFAULT 0 NOT NULL,
	"reply_ms_total" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stats_business_id_day_pk" PRIMARY KEY("business_id","day")
);
--> statement-breakpoint
CREATE TABLE "delivery_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"eta" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"actor_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"item_id" uuid,
	"name" text NOT NULL,
	"unit_price_minor" integer NOT NULL,
	"qty" smallint NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "order_items_qty" CHECK ("order_items"."qty" between 1 and 99)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"is_draft" boolean DEFAULT false NOT NULL,
	"source" "actor" NOT NULL,
	"pickup" boolean DEFAULT false NOT NULL,
	"area_id" uuid,
	"area_name" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"subtotal_minor" integer DEFAULT 0 NOT NULL,
	"delivery_fee_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer DEFAULT 0 NOT NULL,
	"cancel_reason" "order_cancel_reason",
	"demo" boolean DEFAULT false NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_staff" (
	"item_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "service_staff_item_id_member_id_pk" PRIMARY KEY("item_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "staff_leaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "staff_leaves_range" CHECK ("staff_leaves"."to_date" >= "staff_leaves"."from_date")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"clerk_user_id" text,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"role" "team_role" NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"color" smallint DEFAULT 0 NOT NULL,
	"provides_services" boolean DEFAULT true NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_color" CHECK ("team_members"."color" between 0 and 7)
);
--> statement-breakpoint
CREATE TABLE "whatsapp_connections" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"status" "wa_status" NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"connected_at" timestamp with time zone,
	"token_expires_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"quality" text DEFAULT 'good' NOT NULL,
	"last_reply_at" timestamp with time zone,
	"is_stub" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ALTER COLUMN "name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "sku" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "booking_settings" ADD COLUMN "lead_minutes" smallint DEFAULT 120 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD COLUMN "horizon_days" smallint DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD COLUMN "auto_confirm" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "type" "business_type" DEFAULT 'other' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "offers" jsonb DEFAULT '{"products":true,"services":false,"delivery":false}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "city" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "landmark" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "parking" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "returns_policy" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "cancel_policy" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "rules" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "delivery_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "free_over_minor" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "sections" jsonb DEFAULT '{"orders":true,"bookings":true,"products":true,"services":true,"delivery":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "after_hours" "after_hours" DEFAULT 'reply' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "section_updated" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "onboarding" jsonb DEFAULT '{"step":1,"maxStep":1,"skipped":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "dismissed_faq_suggestions" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "next_order_no" integer DEFAULT 1001 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "next_booking_no" integer DEFAULT 101 NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "category" "faq_category" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "alts" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "usage_month" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "kind" "item_kind" DEFAULT 'product' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "variants" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_mode" "stock_mode" DEFAULT 'always' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "stock_qty" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "duration_min" smallint;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "buffer_min" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "days" smallint[] DEFAULT '{0,1,2,3,4,5,6}'::smallint[] NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_items" ADD CONSTRAINT "attention_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_item_id_products_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stats" ADD CONSTRAINT "daily_stats_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_areas" ADD CONSTRAINT "delivery_areas_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_item_id_products_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_area_id_delivery_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."delivery_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_item_id_products_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_staff" ADD CONSTRAINT "service_staff_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_member_id_team_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attention_business_idx" ON "attention_items" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_business_number_uq" ON "bookings" USING btree ("business_id","number");--> statement-breakpoint
CREATE INDEX "bookings_business_starts_idx" ON "bookings" USING btree ("business_id","starts_at");--> statement-breakpoint
CREATE INDEX "delivery_areas_business_idx" ON "delivery_areas" USING btree ("business_id","position");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_number_uq" ON "orders" USING btree ("business_id","number");--> statement-breakpoint
CREATE INDEX "orders_business_created_idx" ON "orders" USING btree ("business_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "staff_leaves_business_idx" ON "staff_leaves" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "team_members_business_idx" ON "team_members" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_members_clerk_uq" ON "team_members" USING btree ("clerk_user_id") WHERE "team_members"."clerk_user_id" is not null;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_service_duration" CHECK ("products"."kind" <> 'service' or "products"."duration_min" between 5 and 480);