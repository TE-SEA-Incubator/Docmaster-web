-- Configure document type expiration behavior
-- delai_expiration_mois = 0 means no expiration date
-- delai_expiration_mois > 0 means the document is valid for N months

ALTER TABLE document_types ALTER COLUMN delai_expiration_mois SET DEFAULT 0;

-- Update existing types with realistic expiration durations
UPDATE document_types SET delai_expiration_mois = 120 WHERE code = 'CNI';       -- 10 years
UPDATE document_types SET delai_expiration_mois = 60  WHERE code = 'PASSPORT';   -- 5 years
UPDATE document_types SET delai_expiration_mois = 12  WHERE code = 'CARTE_GRISE'; -- 1 year
UPDATE document_types SET delai_expiration_mois = 60  WHERE code = 'PERMIS';     -- 5 years
UPDATE document_types SET delai_expiration_mois = 0   WHERE code = 'DIPLOME';    -- No expiration
