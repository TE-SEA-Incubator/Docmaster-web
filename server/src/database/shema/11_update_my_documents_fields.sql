-- Migration to add missing fields to my_documents
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS date_delivrance DATE;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS nom_autorite TEXT;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT false;
ALTER TABLE my_documents ADD COLUMN IF NOT EXISTS declaration_id UUID;
