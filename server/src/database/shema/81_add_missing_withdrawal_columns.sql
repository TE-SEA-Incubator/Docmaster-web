-- Migration 81: Add missing columns to withdrawals table
-- Date: 2026-11-02
-- Description: Add partenaire_id, provider, withdrawal_reference, processed_at columns

-- Add partenaire_id column (separate from user_id for clarity)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS partenaire_id UUID;

-- Add foreign key constraint to partenaires table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'withdrawals_partenaire_id_fkey' 
        AND table_name = 'withdrawals'
    ) THEN
        ALTER TABLE withdrawals 
        ADD CONSTRAINT withdrawals_partenaire_id_fkey 
        FOREIGN KEY (partenaire_id) REFERENCES partenaires(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add provider column (NOKASH or SHAREPAY)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'NOKASH';

-- Add withdrawal_reference column (unique reference for the withdrawal)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS withdrawal_reference VARCHAR(100);

-- Add processed_at column (timestamp when withdrawal was completed)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_withdrawals_partenaire_id 
ON withdrawals(partenaire_id) WHERE partenaire_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawals_provider 
ON withdrawals(provider);

CREATE INDEX IF NOT EXISTS idx_withdrawals_withdrawal_reference 
ON withdrawals(withdrawal_reference) WHERE withdrawal_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawals_processed_at 
ON withdrawals(processed_at) WHERE processed_at IS NOT NULL;

-- Add composite index for partner withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_partner_status 
ON withdrawals(partenaire_id, status) WHERE partenaire_id IS NOT NULL;

-- Add check constraint for provider
ALTER TABLE withdrawals 
DROP CONSTRAINT IF EXISTS check_withdrawal_provider;

ALTER TABLE withdrawals 
ADD CONSTRAINT check_withdrawal_provider 
CHECK (provider IN ('NOKASH', 'SHAREPAY'));

-- Add comments
COMMENT ON COLUMN withdrawals.partenaire_id IS 'ID du partenaire (si source_type = PARTENAIRE). Peut être NULL si compte supprimé.';
COMMENT ON COLUMN withdrawals.provider IS 'Fournisseur de paiement: NOKASH ou SHAREPAY';
COMMENT ON COLUMN withdrawals.withdrawal_reference IS 'Référence unique du retrait (générée par le système ou le provider)';
COMMENT ON COLUMN withdrawals.processed_at IS 'Date et heure de traitement du retrait (quand status devient COMPLETED)';

-- Update existing withdrawals to set provider
UPDATE withdrawals 
SET provider = 'NOKASH' 
WHERE provider IS NULL;

