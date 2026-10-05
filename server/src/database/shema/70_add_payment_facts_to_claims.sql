-- 70_add_payment_facts_to_claims.sql
-- La récompense du trouveur doit refléter l'encaissement réel, pas le tarif en vigueur
-- au moment de la validation. claims ne stockait ni montant ni référence de transaction.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'XAF';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_claims_transaction_id ON claims(transaction_id);
