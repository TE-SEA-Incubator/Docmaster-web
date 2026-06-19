-- Migration: Add contact fields to declarations table
-- Created: 2026-05-02
-- Purpose: Store contact information collected from the form

ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS telephone_contact VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS pays VARCHAR(100),
ADD COLUMN IF NOT EXISTS mode_contact VARCHAR(50) DEFAULT 'APP_CHAT';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_declarations_region ON declarations(region);
CREATE INDEX IF NOT EXISTS idx_declarations_pays ON declarations(pays);
