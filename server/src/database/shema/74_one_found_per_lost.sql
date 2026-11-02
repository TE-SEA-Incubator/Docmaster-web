-- 74_one_found_per_lost.sql
-- Règle métier : un document trouvé (FOUND) peut correspondre à plusieurs
-- déclarations de perte (LOST), mais une déclaration de perte ne peut avoir
-- qu'un seul document trouvé actif à la fois.

-- 1. Nettoyer les doublons historiques en gardant le meilleur candidat :
--    priorité à la correspondance déjà confirmée par le propriétaire, puis au
--    score, puis à la plus ancienne.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY lost_declaration_id
           ORDER BY (owner_confirmed_at IS NOT NULL) DESC,
                    score DESC,
                    created_at ASC,
                    id ASC
         ) AS rn
  FROM matches
  WHERE status IN ('PENDING', 'CONFIRMED')
)
UPDATE matches m
SET status = 'REJECTED',
    closed_reason = 'ONE_FOUND_PER_LOST',
    closed_at = NOW(),
    updated_at = NOW()
FROM ranked r
WHERE m.id = r.id
  AND r.rn > 1;

-- 2. Empêcher tout nouveau doublon actif pour une même déclaration perdue.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_match_per_lost
  ON matches(lost_declaration_id)
  WHERE status IN ('PENDING', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_matches_owner_confirmed
  ON matches(lost_declaration_id, owner_confirmed_at)
  WHERE status IN ('PENDING', 'CONFIRMED');
