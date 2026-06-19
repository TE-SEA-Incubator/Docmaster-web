-- Migration: Add fields, color, and bg to document_types
ALTER TABLE document_types ADD COLUMN fields JSONB;
ALTER TABLE document_types ADD COLUMN color VARCHAR(20);
ALTER TABLE document_types ADD COLUMN bg VARCHAR(20);

-- Update existing records with some default colors if needed, 
-- but seeding will handle the specific values.
