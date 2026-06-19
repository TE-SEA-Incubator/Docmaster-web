-- Table to track confirmed or potential matches to avoid double notifications
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lost_declaration_id UUID REFERENCES declarations(id) ON DELETE CASCADE,
    found_declaration_id UUID REFERENCES declarations(id) ON DELETE CASCADE,
    score INTEGER,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, CONFIRMED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lost_declaration_id, found_declaration_id)
);
