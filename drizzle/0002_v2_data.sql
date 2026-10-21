-- v2 data migration. Runs between the additive and the drop migration, so the old columns still exist.
-- Every statement is safe on an empty database.

-- 1. type (old «متجر»/shop has no direct v2 equivalent → other)
UPDATE "businesses" SET "type" = CASE "category"::text
  WHEN 'clinic' THEN 'clinic'::business_type
  WHEN 'salon' THEN 'salon'::business_type
  WHEN 'restaurant' THEN 'food'::business_type
  ELSE 'other'::business_type END;--> statement-breakpoint

-- booking_settings must exist for every business (the old enabled flag feeds offers)
INSERT INTO "booking_settings" ("business_id") SELECT "id" FROM "businesses" ON CONFLICT DO NOTHING;--> statement-breakpoint

-- 2. offers
UPDATE "businesses" b SET "offers" = jsonb_build_object(
  'products', true,
  'services', coalesce((SELECT bs."enabled" FROM "booking_settings" bs WHERE bs."business_id" = b."id"), false),
  'delivery', coalesce(("delivery"->>'enabled')::boolean, false));--> statement-breakpoint

-- 3. delivery
UPDATE "businesses" SET "delivery_enabled" = coalesce(("delivery"->>'enabled')::boolean, false);--> statement-breakpoint
INSERT INTO "delivery_areas" ("business_id", "name", "fee_minor", "eta", "position")
SELECT "id", left(btrim("delivery"->>'areas'), 60), coalesce(nullif("delivery"->>'feeMinor', '')::integer, 0), 'يوم عمل واحد', 0
FROM "businesses" WHERE btrim(coalesce("delivery"->>'areas', '')) <> '';--> statement-breakpoint

-- 4. business_hours: one row per weekday (0 = Saturday … 6 = Friday)
INSERT INTO "business_hours" ("business_id", "weekday", "open", "open_min", "close_min", "break_start_min", "break_end_min")
SELECT b."id", d.wd,
  coalesce((SELECT od."open" FROM "open_days" od WHERE od."business_id" = b."id" AND od."weekday" = d.wd), d.wd <> 6),
  coalesce(r.mn, 540), coalesce(r.mx, 1020),
  CASE WHEN r.second_start IS NOT NULL AND r.second_start > r.first_end THEN r.first_end END,
  CASE WHEN r.second_start IS NOT NULL AND r.second_start > r.first_end THEN r.second_start END
FROM "businesses" b
CROSS JOIN generate_series(0, 6) AS d(wd)
LEFT JOIN LATERAL (
  SELECT min(a."start_min") AS mn, max(a."end_min") AS mx,
    (SELECT a2."end_min" FROM "availability" a2 WHERE a2."business_id" = b."id" AND a2."weekday" = d.wd ORDER BY a2."start_min" LIMIT 1) AS first_end,
    (SELECT a3."start_min" FROM "availability" a3 WHERE a3."business_id" = b."id" AND a3."weekday" = d.wd ORDER BY a3."start_min" OFFSET 1 LIMIT 1) AS second_start
  FROM "availability" a WHERE a."business_id" = b."id" AND a."weekday" = d.wd
) r ON true
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- 5. onboarding state
UPDATE "businesses" SET "onboarding" = CASE WHEN "onboarded_at" IS NOT NULL
  THEN '{"step":8,"maxStep":8,"skipped":[]}'::jsonb ELSE '{"step":1,"maxStep":1,"skipped":[]}'::jsonb END;--> statement-breakpoint

-- 6. owner team member (P3 refreshes the name from Clerk when it is empty or equals the business name)
INSERT INTO "team_members" ("business_id", "clerk_user_id", "name", "role", "status", "color", "provides_services")
SELECT "id", "owner_user_id", "name", 'owner', 'active', abs(hashtext("id"::text)) % 8, false FROM "businesses"
ON CONFLICT DO NOTHING;--> statement-breakpoint

-- 7. ai_settings (the config column is completed with defaults by aiConfigSchema when read)
INSERT INTO "ai_settings" ("business_id", "enabled") SELECT "id", ("onboarded_at" IS NOT NULL) FROM "businesses" ON CONFLICT DO NOTHING;--> statement-breakpoint

-- 8. FAQs: drop the payment questions and the unanswered ones, keep the rest enabled
DELETE FROM "faqs" WHERE "template_key" IN ('common.payment', 'shop.4') OR btrim("answer") = '';--> statement-breakpoint
UPDATE "faqs" SET "enabled" = true, "category" = 'general';--> statement-breakpoint

-- 9. catalog: keep the visual order the owner had
UPDATE "products" p SET "position" = s.rn FROM (
  SELECT "id", row_number() OVER (PARTITION BY "business_id" ORDER BY "created_at") AS rn FROM "products"
) s WHERE s."id" = p."id";--> statement-breakpoint

-- 10. double booking protection: the same member can never hold overlapping pending/confirmed bookings
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("member_id" WITH =, tstzrange("starts_at", "blocked_until") WITH &&)
  WHERE ("status" IN ('pending', 'confirmed') AND "member_id" IS NOT NULL);
