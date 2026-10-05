-- Refresh tokens for user/admin sessions
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_refresh_token_hash ON users(refresh_token_hash);
