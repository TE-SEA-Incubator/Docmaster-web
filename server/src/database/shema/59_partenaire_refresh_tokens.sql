-- Refresh tokens pour sessions partenaires (mobile + web)
ALTER TABLE partenaires ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);
ALTER TABLE partenaires ADD COLUMN IF NOT EXISTS refresh_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_partenaires_refresh_token_hash ON partenaires(refresh_token_hash);
