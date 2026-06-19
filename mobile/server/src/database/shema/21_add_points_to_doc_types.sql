-- Migration: Add points reward to document types
ALTER TABLE document_types ADD COLUMN points_recompense INTEGER DEFAULT 0;

-- Update existing types with some default points
UPDATE document_types SET points_recompense = 50 WHERE code = 'CNI';
UPDATE document_types SET points_recompense = 100 WHERE code = 'PASSPORT';
UPDATE document_types SET points_recompense = 50 WHERE code = 'PERMIS';
UPDATE document_types SET points_recompense = 75 WHERE code = 'CARTE_GRISE';
UPDATE document_types SET points_recompense = 150 WHERE code = 'DIPLOME';
