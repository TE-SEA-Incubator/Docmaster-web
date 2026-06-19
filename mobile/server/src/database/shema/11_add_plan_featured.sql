-- Migration: Add is_featured column to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Update a default featured plan (Standard)
UPDATE plans SET is_featured = true WHERE id = 'standard';
