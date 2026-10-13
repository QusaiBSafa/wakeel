CREATE TYPE "public"."business_category" AS ENUM('clinic', 'salon', 'restaurant', 'shop', 'other');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('ILS', 'JOD', 'USD', 'SAR', 'AED', 'EGP');--> statement-breakpoint
CREATE TYPE "public"."faq_status" AS ENUM('open', 'answered', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."hours_mode" AS ENUM('booking', 'custom');--> statement-breakpoint
CREATE TABLE "availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_min" smallint NOT NULL,
	"end_min" smallint NOT NULL,
	CONSTRAINT "availability_weekday" CHECK ("availability"."weekday" between 0 and 6),
	CONSTRAINT "availability_range" CHECK ("availability"."start_min" >= 0 and "availability"."end_min" <= 1440 and "availability"."end_min" > "availability"."start_min")
);
--> statement-breakpoint
CREATE TABLE "booking_settings" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"slot_minutes" smallint DEFAULT 30 NOT NULL,
	"buffer_minutes" smallint DEFAULT 0 NOT NULL,
	"timezone" text DEFAULT 'Asia/Hebron' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_slot_range" CHECK ("booking_settings"."slot_minutes" between 5 and 480),
	CONSTRAINT "booking_buffer_range" CHECK ("booking_settings"."buffer_minutes" between 0 and 120)
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "business_category" DEFAULT 'other' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"logo_pathname" text,
	"address" text DEFAULT '' NOT NULL,
	"map_url" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"socials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"payment_methods" text[] DEFAULT '{}'::text[] NOT NULL,
	"delivery" jsonb DEFAULT '{"enabled":false}'::jsonb NOT NULL,
	"hours_mode" "hours_mode" DEFAULT 'booking' NOT NULL,
	"hours_text" text DEFAULT '' NOT NULL,
	"onboarding_step" smallint DEFAULT 0 NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "businesses_owner_user_id_unique" UNIQUE("owner_user_id")
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"date" date NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"template_key" text,
	"question" text NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"status" "faq_status" DEFAULT 'open' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notify_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"feature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "open_days" (
	"business_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	CONSTRAINT "open_days_business_id_weekday_pk" PRIMARY KEY("business_id","weekday")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" "currency" DEFAULT 'ILS' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text,
	"image_pathname" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_minor" > 0)
);
--> statement-breakpoint
ALTER TABLE "availability" ADD CONSTRAINT "availability_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "closures" ADD CONSTRAINT "closures_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_days" ADD CONSTRAINT "open_days_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_business_idx" ON "availability" USING btree ("business_id","weekday");--> statement-breakpoint
CREATE UNIQUE INDEX "closures_business_date_uq" ON "closures" USING btree ("business_id","date");--> statement-breakpoint
CREATE INDEX "faqs_business_idx" ON "faqs" USING btree ("business_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "faqs_business_template_uq" ON "faqs" USING btree ("business_id","template_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notify_business_feature_uq" ON "notify_requests" USING btree ("business_id","feature");--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_sku_uq" ON "products" USING btree ("business_id",lower("sku")) WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_business_idx" ON "products" USING btree ("business_id");