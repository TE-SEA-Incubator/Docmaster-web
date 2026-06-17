-- Add details JSONB column to matches table for storing score criteria breakdown
ALTER TABLE matches ADD COLUMN IF NOT EXISTS details JSONB DEFAULT NULL;
