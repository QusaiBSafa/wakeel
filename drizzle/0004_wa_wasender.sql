CREATE TABLE "wa_events" (
	"business_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"cust" text NOT NULL,
	"day" date NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_events_business_id_external_id_pk" PRIMARY KEY("business_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "wa_pairings" (
	"business_id" uuid PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"phone" text NOT NULL,
	"webhook_secret_enc" text,
	"hook_token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wa_pairings_hook_token_hash_unique" UNIQUE("hook_token_hash")
);
--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "provider" text DEFAULT 'stub' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "api_key_enc" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "webhook_secret_enc" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "hook_token_hash" text;--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD COLUMN "last_inbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wa_events" ADD CONSTRAINT "wa_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wa_pairings" ADD CONSTRAINT "wa_pairings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wa_events_cust_day_idx" ON "wa_events" USING btree ("business_id","cust","day");--> statement-breakpoint
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_hook_token_hash_unique" UNIQUE("hook_token_hash");