-- Stocke l'identifiant de la transaction Nokash sur le retrait si possible.
-- Protégé par un bloc DO pour ne pas bloquer si l'utilisateur DB n'a pas les droits DDL sur withdrawals.
DO $$
BEGIN
    BEGIN
        ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS nokash_id VARCHAR(64);
        UPDATE withdrawals
        SET nokash_id = substring(admin_note FROM 'ID:\s*([0-9a-fA-F]{20,64})')
        WHERE nokash_id IS NULL
          AND admin_note IS NOT NULL
          AND admin_note LIKE '%Nokash Payout%';
        CREATE INDEX IF NOT EXISTS idx_withdrawals_nokash_id ON withdrawals(nokash_id);
        CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created ON withdrawals(status, created_at);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: nokash_id column could not be added (insufficient privileges, handled dynamically in app code): %', SQLERRM;
    END;
END $$;
