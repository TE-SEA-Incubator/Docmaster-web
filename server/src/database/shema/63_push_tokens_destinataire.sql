-- Allow push tokens for USER, PARTENAIRE and AUTORITE
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey;
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS destinataire_type VARCHAR(20) NOT NULL DEFAULT 'USER';

-- Index updates
DROP INDEX IF EXISTS idx_push_tokens_user_id;
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_destinataire ON push_tokens(user_id, destinataire_type);
