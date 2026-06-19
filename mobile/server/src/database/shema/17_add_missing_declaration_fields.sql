-- Migration: Add missing fields to declarations table
-- Created: 2026-05-02
-- Purpose: Fix field mapping for declarations (date_naissance, urgence_niveau, recompense_montant, date_perte)

-- Add missing columns if they don't exist
ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS urgence_niveau VARCHAR(50) DEFAULT 'Modérée',
ADD COLUMN IF NOT EXISTS recompense_montant DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS date_perte DATE;

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_declarations_date_perte ON declarations(date_perte);
CREATE INDEX IF NOT EXISTS idx_declarations_urgence_niveau ON declarations(urgence_niveau);
CREATE INDEX IF NOT EXISTS idx_declarations_reporter_status ON declarations(reporter_id, status);
