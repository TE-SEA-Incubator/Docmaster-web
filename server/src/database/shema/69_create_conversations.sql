-- Messagerie entre le propriétaire (client) et le trouveur.
-- Un fil n'est créé qu'après paiement confirmé (activateRecovery), jamais au matching.
-- Les participants sont polymorphes comme les notifications (cf. 56_notification_destinataire.sql) :
-- un trouveur peut être un users.id OU un partenaires.id (declarations.reporter_type).

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    lost_declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    found_declaration_id UUID REFERENCES declarations(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (lost_declaration_id, found_declaration_id)
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('USER', 'PARTENAIRE', 'AUTORITE')),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('OWNER', 'FINDER')),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, actor_type, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_actor
    ON conversation_participants(actor_type, actor_id, last_read_at);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('USER', 'PARTENAIRE', 'AUTORITE')),
    sender_id UUID NOT NULL,
    body TEXT NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'TEXT' CHECK (kind IN ('TEXT', 'SYSTEM')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, created_at DESC);

-- Performance indexes for conversations and messages (moved from 69_performance_indexes.sql)
CREATE INDEX IF NOT EXISTS idx_conversations_user1_user2 ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
