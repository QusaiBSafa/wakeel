-- Assertions after migrating the legacy row from scripts/seed-legacy-0000.sql.
-- psql $DATABASE_URL -v ON_ERROR_STOP=1 -f scripts/check-v2-migration.sql
DO $$
DECLARE b businesses%ROWTYPE; n integer;
BEGIN
  SELECT * INTO b FROM businesses WHERE id = '11111111-1111-1111-1111-111111111111';
  IF b.type <> 'food' THEN RAISE EXCEPTION 'type is %', b.type; END IF;
  IF b.offers <> '{"products":true,"services":true,"delivery":true}'::jsonb THEN RAISE EXCEPTION 'offers is %', b.offers; END IF;
  IF NOT b.delivery_enabled THEN RAISE EXCEPTION 'delivery_enabled'; END IF;
  IF (b.onboarding->>'step')::int <> 8 THEN RAISE EXCEPTION 'onboarding %', b.onboarding; END IF;

  SELECT count(*) INTO n FROM business_hours WHERE business_id = b.id;
  IF n <> 7 THEN RAISE EXCEPTION 'business_hours rows: %', n; END IF;
  SELECT count(*) INTO n FROM business_hours WHERE business_id = b.id AND weekday = 0 AND open AND open_min = 540 AND close_min = 1080 AND break_start_min = 780 AND break_end_min = 840;
  IF n <> 1 THEN RAISE EXCEPTION 'saturday should have the 13:00-14:00 break'; END IF;
  SELECT count(*) INTO n FROM business_hours WHERE business_id = b.id AND weekday = 6 AND NOT open;
  IF n <> 1 THEN RAISE EXCEPTION 'friday should be closed'; END IF;
  SELECT count(*) INTO n FROM business_hours WHERE business_id = b.id AND weekday = 1 AND open AND open_min = 540 AND close_min = 1020;
  IF n <> 1 THEN RAISE EXCEPTION 'default hours for a day without ranges'; END IF;

  SELECT count(*) INTO n FROM delivery_areas WHERE business_id = b.id AND name = 'رام الله' AND fee_minor = 1500;
  IF n <> 1 THEN RAISE EXCEPTION 'delivery area row'; END IF;
  SELECT count(*) INTO n FROM faqs WHERE business_id = b.id;
  IF n <> 1 THEN RAISE EXCEPTION 'faqs left: % (expected only the answered non-payment one)', n; END IF;
  SELECT count(*) INTO n FROM team_members WHERE business_id = b.id AND role = 'owner' AND clerk_user_id = 'user_legacy';
  IF n <> 1 THEN RAISE EXCEPTION 'owner member'; END IF;
  SELECT count(*) INTO n FROM ai_settings WHERE business_id = b.id AND enabled;
  IF n <> 1 THEN RAISE EXCEPTION 'ai_settings'; END IF;

  SELECT count(*) INTO n FROM information_schema.columns WHERE table_name = 'businesses' AND column_name = 'payment_methods';
  IF n <> 0 THEN RAISE EXCEPTION 'payment_methods column still exists'; END IF;
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku';
  IF n <> 0 THEN RAISE EXCEPTION 'sku column still exists'; END IF;
  SELECT count(*) INTO n FROM pg_constraint WHERE conname = 'bookings_no_overlap';
  IF n <> 1 THEN RAISE EXCEPTION 'exclusion constraint missing'; END IF;
  SELECT count(*) INTO n FROM information_schema.tables WHERE table_name IN ('availability', 'open_days', 'notify_requests');
  IF n <> 0 THEN RAISE EXCEPTION 'old tables remain'; END IF;
  SELECT count(*) INTO n FROM information_schema.columns WHERE column_name ~* '(message|transcript|reply_text|payment)' AND NOT (table_name = 'daily_stats' AND column_name = 'messages');
  IF n <> 0 THEN RAISE EXCEPTION 'forbidden column names present'; END IF;
END $$;
SELECT 'v2 migration checks passed' AS result;
