-- Public search performance indexes.
-- The public endpoint filters FOUND + AVAILABLE and orders by newest first.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_declarations_public_found
  ON declarations (created_at DESC)
  WHERE declaration_type = 'FOUND' AND status = 'AVAILABLE';

CREATE INDEX IF NOT EXISTS idx_declarations_owner_name_trgm
  ON declarations USING gin (owner_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_declarations_document_number_trgm
  ON declarations USING gin (document_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_declarations_identifiant_doc_dm_trgm
  ON declarations USING gin (identifiant_doc_dm gin_trgm_ops);
