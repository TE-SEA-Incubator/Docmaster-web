-- Migration: Align plan feature keys with feature_definitions codes
-- Old keys: objects, alerts (array), geo, support
-- New keys: objects_limit, sms_alerts, email_alerts, geo_tracking, priority_support

UPDATE plans SET features = jsonb_build_object(
  'docs_per_type', COALESCE(features->>'docs_per_type', '1')::int,
  'objects_limit', COALESCE(features->>'objects', '2')::int,
  'sms_alerts', CASE WHEN features->'alerts' @> '["sms"]'::jsonb OR features->'alerts' @> '["all"]'::jsonb THEN true ELSE false END,
  'email_alerts', CASE WHEN features->'alerts' @> '["email"]'::jsonb OR features->'alerts' @> '["all"]'::jsonb THEN true ELSE false END,
  'geo_tracking', CASE WHEN features->>'geo' IS NOT NULL AND features->>'geo' != 'none' THEN true ELSE false END,
  'priority_support', CASE WHEN features->>'support' = 'priority' THEN true ELSE false END,
  'verified_badge', false,
  'history_days', 30,
  'ads_free', false,
  'export_data', false
) WHERE features ? 'objects';
