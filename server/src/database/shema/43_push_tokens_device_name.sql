-- Add device_name column to push_tokens for better token identification
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS device_name TEXT;
