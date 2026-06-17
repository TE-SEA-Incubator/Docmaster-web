-- Add validity option and archive columns to my_documents
-- Option A: 'EXPIRING' - document with expiration date (reminders, auto-archive)
-- Option B: 'PERMANENT' - document without expiration (valid indefinitely)

ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS validity_option VARCHAR(10) NOT NULL DEFAULT 'EXPIRING';
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS expiration_reminded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS expiration_reminded_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient expiration queries (cron jobs)
CREATE INDEX IF NOT EXISTS idx_my_documents_expiration
  ON my_documents(date_expiration)
  WHERE is_archived = false AND validity_option = 'EXPIRING';
