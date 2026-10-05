-- Track last update time on transactions (used by withdrawal status updates)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
