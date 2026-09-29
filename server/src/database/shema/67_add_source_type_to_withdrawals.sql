-- Migration 67: Add source_type to withdrawals to support partner withdrawals
-- This allows us to differentiate between user withdrawals and partner withdrawals

-- Add source_type column (USER or PARTENAIRE)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'USER';

-- Update existing withdrawals to be USER type
UPDATE withdrawals SET source_type = 'USER' WHERE source_type IS NULL;

-- Remove the NOT NULL constraint on user_id to allow orphan records after deletion
-- (partner withdrawals will use user_id to store partenaire_id, but we want to keep history even after partner deletion)
ALTER TABLE withdrawals 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the old FK constraint if it exists (to allow NULL and prevent cascading issues)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'withdrawals_user_id_fkey' 
        AND table_name = 'withdrawals'
    ) THEN
        ALTER TABLE withdrawals DROP CONSTRAINT withdrawals_user_id_fkey;
    END IF;
END $$;

-- Add index for faster filtering by source_type
CREATE INDEX IF NOT EXISTS idx_withdrawals_source_type ON withdrawals(source_type);

-- Add composite index for user/partner lookups
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_source ON withdrawals(user_id, source_type) WHERE user_id IS NOT NULL;

-- Add check constraint to ensure source_type is valid
ALTER TABLE withdrawals 
ADD CONSTRAINT check_source_type 
CHECK (source_type IN ('USER', 'PARTENAIRE'));

-- Add comments for clarity
COMMENT ON COLUMN withdrawals.source_type IS 'Type de source: USER (utilisateur normal) ou PARTENAIRE (organisation partenaire)';
COMMENT ON COLUMN withdrawals.user_id IS 'ID de l''utilisateur (si USER) ou ID du partenaire (si PARTENAIRE). Peut être NULL si le compte a été supprimé (historique conservé).';
