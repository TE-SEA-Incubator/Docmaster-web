-- Points de fidélité pour les partenaires (même modèle que users.points)

ALTER TABLE partenaires
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS partenaire_earnings_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partenaire_id UUID NOT NULL REFERENCES partenaires(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'POINTS',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_peh_partenaire_id ON partenaire_earnings_history(partenaire_id);
CREATE INDEX IF NOT EXISTS idx_peh_created_at ON partenaire_earnings_history(created_at DESC);
