-- Migration 61: Align claims.doc_id on LOST declaration id (legacy data used FOUND id)
-- Run after deploying recovery/matching fixes.

BEGIN;

-- 1. Repoint claims linked to a FOUND declaration → LOST side via matches
UPDATE claims c
SET doc_id = m.lost_declaration_id
FROM declarations d
JOIN matches m ON m.found_declaration_id = d.id
WHERE c.doc_id = d.id
  AND d.declaration_type = 'FOUND'
  AND c.status IN ('PENDING', 'PAID', 'VALIDATED')
  AND m.lost_declaration_id IS NOT NULL
  AND c.doc_id IS DISTINCT FROM m.lost_declaration_id;

-- 2. Also fix via lost_declaration_id join when claim was on found side of an existing match row
UPDATE claims c
SET doc_id = m.lost_declaration_id
FROM matches m
WHERE c.doc_id = m.found_declaration_id
  AND c.status IN ('PENDING', 'PAID', 'VALIDATED')
  AND c.doc_id IS DISTINCT FROM m.lost_declaration_id;

-- 3. Invalidate obsolete PENDING claims (pre-payment codes from old matching flow)
UPDATE claims
SET status = 'FAILED'
WHERE status = 'PENDING'
  AND NOT EXISTS (
    SELECT 1 FROM declarations d
    WHERE d.id = claims.doc_id
      AND d.payment_status = 'PAID'
  );

-- 4. Deduplicate: keep best claim per (doc_id LOST, owner_id)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY doc_id, owner_id
      ORDER BY
        CASE status
          WHEN 'VALIDATED' THEN 0
          WHEN 'PAID' THEN 1
          WHEN 'PENDING' THEN 2
          ELSE 3
        END,
        created_at DESC
    ) AS rn
  FROM claims
)
DELETE FROM claims
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 5. Ensure finder_id is set from match when missing on PAID claims
UPDATE claims c
SET finder_id = fd.reporter_id
FROM matches m
JOIN declarations fd ON fd.id = m.found_declaration_id
WHERE c.doc_id = m.lost_declaration_id
  AND c.status IN ('PAID', 'VALIDATED')
  AND c.finder_id IS NULL
  AND fd.reporter_id IS NOT NULL;

COMMIT;
