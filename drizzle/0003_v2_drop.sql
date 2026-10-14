ALTER TABLE "availability" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notify_requests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "open_days" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "availability" CASCADE;--> statement-breakpoint
DROP TABLE "notify_requests" CASCADE;--> statement-breakpoint
DROP TABLE "open_days" CASCADE;--> statement-breakpoint
ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_slot_range";--> statement-breakpoint
ALTER TABLE "booking_settings" DROP CONSTRAINT "booking_buffer_range";--> statement-breakpoint
DROP INDEX "products_business_sku_uq";--> statement-breakpoint
ALTER TABLE "booking_settings" DROP COLUMN "enabled";--> statement-breakpoint
ALTER TABLE "booking_settings" DROP COLUMN "slot_minutes";--> statement-breakpoint
ALTER TABLE "booking_settings" DROP COLUMN "buffer_minutes";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "payment_methods";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "delivery";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "hours_mode";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "hours_text";--> statement-breakpoint
ALTER TABLE "businesses" DROP COLUMN "onboarding_step";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "sku";--> statement-breakpoint
ALTER TABLE "faqs" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."business_category";--> statement-breakpoint
DROP TYPE "public"."faq_status";--> statement-breakpoint
DROP TYPE "public"."hours_mode";