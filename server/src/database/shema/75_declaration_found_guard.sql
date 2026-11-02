-- 75_declaration_found_guard.sql
-- Anti-abus des trouvailles :
-- 1. index de comptage pour la limite « 2 FOUND / 10 minutes » par utilisateur ;
-- 2. unicité du couple (empreinte, type) pour empêcher un doublon actif créé en
--    concurrence (la vérification applicative seule reste sujette aux races).
--
-- L'index partiel exclut les statuts terminaux : un document revenu puis de
-- nouveau perdu peut être redéclaré.

CREATE INDEX IF NOT EXISTS idx_declarations_reporter_type_created
  ON declarations(reporter_id, declaration_type, created_at DESC);

-- Dédupliquer les enregistrements existants avant de créer l'index unique.
-- En cas de doublon (fingerprint + declaration_type actifs), on garde le plus
-- récent et on annule les autres.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY fingerprint, declaration_type
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM declarations
  WHERE fingerprint IS NOT NULL
    AND status NOT IN ('RETURNED', 'CANCELLED')
)
UPDATE declarations
SET status = 'CANCELLED'
FROM ranked
WHERE declarations.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_declaration_fingerprint_type
  ON declarations(fingerprint, declaration_type)
  WHERE fingerprint IS NOT NULL
    AND status NOT IN ('RETURNED', 'CANCELLED');
