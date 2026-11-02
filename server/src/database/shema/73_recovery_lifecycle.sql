-- 73_recovery_lifecycle.sql
-- Plusieurs correspondances possibles pour un même FOUND, mais une seule
-- récupération gagnante. Le premier paiement confirmé réserve le document ;
-- les autres candidats sont clôturés et notifiés.

ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS found_declaration_id UUID REFERENCES declarations(id) ON DELETE SET NULL;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS owner_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS owner_confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_reason VARCHAR(50),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS recovery_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  lost_declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  found_declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RESERVED'
    CHECK (status IN ('RESERVED', 'PAID', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recovery_reservations_found
  ON recovery_reservations(found_declaration_id);
CREATE INDEX IF NOT EXISTS idx_recovery_reservations_lost
  ON recovery_reservations(lost_declaration_id);
CREATE INDEX IF NOT EXISTS idx_recovery_reservations_status_expiry
  ON recovery_reservations(status, expires_at);

-- Une seule réservation active par FOUND et par LOST.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_recovery_reservation_found
  ON recovery_reservations(found_declaration_id)
  WHERE status IN ('RESERVED', 'PAID');
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_recovery_reservation_lost
  ON recovery_reservations(lost_declaration_id)
  WHERE status IN ('RESERVED', 'PAID');

CREATE INDEX IF NOT EXISTS idx_claims_found_declaration
  ON claims(found_declaration_id);

-- Backfill des claims existants uniquement quand la paire est non ambiguë.
UPDATE claims c
SET found_declaration_id = sub.found_id
FROM (
  SELECT c2.id, MIN(m.found_declaration_id::text)::uuid AS found_id
  FROM claims c2
  JOIN matches m ON m.lost_declaration_id = c2.doc_id
  WHERE c2.found_declaration_id IS NULL
  GROUP BY c2.id
  HAVING COUNT(DISTINCT m.found_declaration_id) = 1
) sub
WHERE c.id = sub.id;

-- Empêche deux claims payés/validés pour le même FOUND, si les données le permettent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM claims
    WHERE found_declaration_id IS NOT NULL
      AND status IN ('PAID', 'VALIDATED')
    GROUP BY found_declaration_id
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_claim_found
      ON claims(found_declaration_id)
      WHERE found_declaration_id IS NOT NULL
        AND status IN ('PAID', 'VALIDATED');
  END IF;
END $$;

-- Index de reprise pour les cycles de matching et les rafraîchissements PENDING.
CREATE INDEX IF NOT EXISTS idx_matches_status_score
  ON matches(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_declarations_status_type
  ON declarations(status, declaration_type);
