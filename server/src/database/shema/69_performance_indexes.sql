-- ═══════════════════════════════════════════════════════════════════
-- 69_performance_indexes.sql
-- Index de performance — tous wrappés en DO $$ pour éviter les
-- erreurs si une colonne / table n'existe pas encore.
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN

  -- ── my_documents ──────────────────────────────────────────────
  -- user_id existe depuis migration 05
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='my_documents' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_user_id ON my_documents(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='my_documents' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON my_documents(created_at DESC)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='my_documents' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_status ON my_documents(status)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='my_documents' AND column_name='document_type_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_documents_type_id ON my_documents(document_type_id)';
  END IF;

  -- ── declarations ──────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='declarations' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_declarations_user_id ON declarations(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='declarations' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_declarations_status ON declarations(status)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='declarations' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_declarations_created_at ON declarations(created_at DESC)';
  END IF;
  -- document_type n'existe pas sur declarations (c'est doc_type) — ignoré
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='declarations' AND column_name='document_type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_declarations_document_type ON declarations(document_type)';
  END IF;

  -- ── withdrawals ───────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='provider') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_provider ON withdrawals(provider)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='withdrawals' AND column_name='source_type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_source_type ON withdrawals(source_type)';
  END IF;

  -- ── earnings_history ──────────────────────────────────────────
  -- index user_id et created_at déjà créés dans migration 30, IF NOT EXISTS suffit
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='earnings_history' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_earnings_history_user_id ON earnings_history(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='earnings_history' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_earnings_history_created_at ON earnings_history(created_at DESC)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='earnings_history' AND column_name='type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_earnings_history_type ON earnings_history(type)';
  END IF;

  -- ── wallet_transactions ───────────────────────────────────────
  -- index user_id et created_at déjà créés dans migration 47, IF NOT EXISTS suffit
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='type') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='provider') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider ON wallet_transactions(provider)';
  END IF;

  -- ── partenaire_earnings_history ───────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='partenaire_earnings_history') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partenaire_earnings_history' AND column_name='partenaire_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_partenaire_earnings_partenaire_id ON partenaire_earnings_history(partenaire_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partenaire_earnings_history' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_partenaire_earnings_created_at ON partenaire_earnings_history(created_at DESC)';
    END IF;
  END IF;

  -- ── partenaire_wallet_transactions ────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='partenaire_wallet_transactions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partenaire_wallet_transactions' AND column_name='partenaire_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_partenaire_wallet_partenaire_id ON partenaire_wallet_transactions(partenaire_id)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='partenaire_wallet_transactions' AND column_name='created_at') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_partenaire_wallet_created_at ON partenaire_wallet_transactions(created_at DESC)';
    END IF;
  END IF;

  -- ── transactions ──────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='status') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)';
  END IF;

  -- ── notifications ─────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)';
  END IF;

  -- ── referrals ─────────────────────────────────────────────────
  -- colonnes réelles: parrain_id / filleul_id (migration 04), pas referrer_id / referred_id
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='parrain_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(parrain_id)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='filleul_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(filleul_id)';
  END IF;

  -- ── sessions (table optionnelle) ──────────────────────────────
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sessions') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sessions' AND column_name='expires') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires)';
    END IF;
  END IF;

  -- ── conversations / messages — créés dans 69_create_conversations.sql ──
  -- Ces index sont ajoutés à la fin de ce fichier-là, pas ici.

END $$;
