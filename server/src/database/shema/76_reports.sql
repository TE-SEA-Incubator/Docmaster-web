-- 76_reports.sql
-- Signalements et support : un utilisateur peut signaler une déclaration, une
-- correspondance, une conversation ou un utilisateur, ou envoyer une demande
-- d'aide au support (target_type = 'SUPPORT', sans cible).
--
-- Aucune action financière n'est déclenchée automatiquement : un
-- administrateur examine le signalement et décide.

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID,
    reason_category VARCHAR(30) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    admin_note TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reports_target_type_check CHECK (
        target_type IN ('DECLARATION', 'MATCH', 'CONVERSATION', 'USER', 'SUPPORT')
    ),
    CONSTRAINT reports_reason_check CHECK (
        reason_category IN ('WRONG_DOCUMENT', 'NO_HANDOVER', 'FRAUD', 'ABUSIVE', 'OTHER')
    ),
    CONSTRAINT reports_status_check CHECK (
        status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')
    ),
    CONSTRAINT reports_target_required CHECK (
        (target_type = 'SUPPORT' AND target_id IS NULL)
        OR (target_type <> 'SUPPORT' AND target_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_status_created
  ON reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_created
  ON reports(reporter_id, created_at DESC);

-- Un seul ticket ouvert par (auteur, cible) ; pour le support, la cible est
-- l'UUID nil afin que la contrainte s'applique aussi aux demandes d'aide.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_report_open_target
  ON reports(
    reporter_id,
    target_type,
    COALESCE(target_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status IN ('OPEN', 'IN_REVIEW');
