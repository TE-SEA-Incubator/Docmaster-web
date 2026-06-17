-- Add expiration management features to plans
-- expiration_management: user can choose Option A (with expiry)
-- expiration_reminders: user receives email reminders before expiry
-- auto_archive: expired docs are automatically archived

UPDATE plans SET features = features || jsonb_build_object(
  'expiration_management',
    CASE
      WHEN id = 'free' THEN false
      ELSE true
    END,
  'expiration_reminders',
    CASE
      WHEN id IN ('pro', 'vip') THEN true
      ELSE false
    END,
  'auto_archive', true
);
