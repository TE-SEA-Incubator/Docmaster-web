-- 77_report_actions.sql
-- Un signalement devient un dossier actionnable par l'administrateur :
--   - admin_reply        : réponse visible par le plaignant (admin_note reste interne)
--   - resolution_action  : dernière action exécutée sur le dossier
--   - resolution_payload : faits de l'action (claim, montant, remboursement, ...)
--
-- Le blocage de compte et la prolongation du code de remise sont les leviers
-- concrets associés aux signalements NO_HANDOVER / FRAUD / ABUSIVE.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS resolution_action VARCHAR(40),
  ADD COLUMN IF NOT EXISTS resolution_payload JSONB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Un code de remise régénéré par le support porte sa propre échéance ; sans
-- valeur, la validation retombe sur created_at + CLAIM_CODE_TTL_HOURS.
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_blocked
  ON users(blocked_at)
  WHERE blocked_at IS NOT NULL;
