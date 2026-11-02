-- 80_one_active_lost_per_reporter.sql
-- Règle métier : un utilisateur ne peut avoir qu'UNE SEULE déclaration de perte
-- (LOST) active à la fois, quel que soit le type de document. Tant que la
-- déclaration en cours n'est pas résolue (RETURNED / CANCELLED / CLAIMED),
-- toute nouvelle déclaration de perte est refusée (409).
--
-- 1. Clôturer les doublons historiques en gardant la déclaration la plus
--    récente (la dernière intention de l'utilisateur) ;
-- 2. Empêcher tout nouveau doublon actif, y compris en cas de requêtes
--    concurrentes (la vérification applicative seule reste sujette aux races).

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY reporter_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM declarations
  WHERE declaration_type = 'LOST'
    AND status NOT IN ('RETURNED', 'CANCELLED', 'CLAIMED')
    AND reporter_id IS NOT NULL
)
UPDATE declarations d
SET status = 'CANCELLED'
FROM ranked r
WHERE d.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_lost_per_reporter
  ON declarations(reporter_id)
  WHERE declaration_type = 'LOST'
    AND status NOT IN ('RETURNED', 'CANCELLED', 'CLAIMED')
    AND reporter_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_declarations_reporter_lost_status
  ON declarations(reporter_id, declaration_type, status)
  WHERE declaration_type = 'LOST';
