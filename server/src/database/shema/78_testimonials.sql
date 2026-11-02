-- 78_testimonials.sql
-- Témoignages laissés par un utilisateur après une correspondance confirmée
-- ou une récupération. Un seul avis par déclaration et par utilisateur.
--
-- `context` distingue le moment raconté : MATCH (document trouvé) ou
-- RECOVERY (document récupéré / remis). Les avis publiés alimentent la
-- section « Ils ont retrouvé leurs documents » de la page publique.

CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    context VARCHAR(20) NOT NULL,
    rating SMALLINT NOT NULL,
    comment TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT testimonials_context_check CHECK (context IN ('MATCH', 'RECOVERY')),
    CONSTRAINT testimonials_rating_check CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT testimonials_comment_check CHECK (char_length(comment) BETWEEN 10 AND 500),
    CONSTRAINT testimonials_status_check CHECK (status IN ('PUBLISHED', 'HIDDEN')),
    CONSTRAINT uniq_testimonial_user_declaration UNIQUE (user_id, declaration_id)
);

CREATE INDEX IF NOT EXISTS idx_testimonials_published_created
  ON testimonials(status, created_at DESC);
