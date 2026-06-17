ALTER TABLE plans ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;

UPDATE plans SET duration_months = 1 WHERE duration_months IS NULL;
