-- Inserts a 0000-era business to prove the v2 migrations carry data over (run BEFORE migrating).
-- psql $DATABASE_URL -f scripts/seed-legacy-0000.sql
INSERT INTO businesses (id, owner_user_id, name, category, payment_methods, delivery, onboarded_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'user_legacy', 'مطعم القدس', 'restaurant', '{cash}',
        '{"enabled":true,"areas":"رام الله","feeMinor":1500}', now());
INSERT INTO booking_settings (business_id, enabled, slot_minutes) VALUES ('11111111-1111-1111-1111-111111111111', true, 30);
-- Saturday (0): two ranges 09:00-13:00 and 14:00-18:00; Friday (6) closed
INSERT INTO availability (business_id, weekday, start_min, end_min) VALUES
  ('11111111-1111-1111-1111-111111111111', 0, 540, 780),
  ('11111111-1111-1111-1111-111111111111', 0, 840, 1080);
INSERT INTO open_days (business_id, weekday, open) VALUES ('11111111-1111-1111-1111-111111111111', 6, false);
INSERT INTO faqs (business_id, template_key, question, answer, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'common.payment', 'شو طرق الدفع المتاحة؟', 'كاش', 'answered'),
  ('11111111-1111-1111-1111-111111111111', 'common.hours', 'شو أوقات الدوام؟', 'من 9 إلى 6', 'answered'),
  ('11111111-1111-1111-1111-111111111111', 'common.parking', 'في موقف؟', '', 'open');
INSERT INTO products (business_id, sku, name, price_minor) VALUES ('11111111-1111-1111-1111-111111111111', 'A1', 'شاورما', 2500);
