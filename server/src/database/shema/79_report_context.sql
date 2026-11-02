-- 79_report_context.sql
-- Une demande d'aide (target_type = 'SUPPORT') n'a pas de cible : l'administrateur
-- voyait le texte sans savoir de quel dossier il s'agissait, et ne pouvait donc
-- que répondre. Le serveur y rattache le dernier dossier de récupération actif
-- du plaignant ; les actions de dossier (remboursement, relance, blocage)
-- deviennent accessibles depuis le ticket.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS context_match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reports_context_match
  ON reports(context_match_id)
  WHERE context_match_id IS NOT NULL;
