-- Migration: Add birth info and currency to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS date_naissance DATE,
ADD COLUMN IF NOT EXISTS lieu_naissance VARCHAR(255),
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'XAF';

-- Update updated_at trigger logic if needed (usually handled by application or manual updates)
