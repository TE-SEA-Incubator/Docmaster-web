-- Migration: Create deletion_requests table for declaration cleanup workflow
-- Created: 2026-05-02
-- Purpose: Allow users to request deletion with reason, admins review and approve/reject

CREATE TABLE deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    declaration_id UUID NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    reason_type VARCHAR(50) NOT NULL, -- 'DUPLICATE', 'INCORRECT_DATA', 'NO_LONGER_NEEDED', 'PRIVACY', 'OTHER'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXECUTED'
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Which admin reviewed it
    admin_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_declaration_id ON deletion_requests(declaration_id);
CREATE INDEX idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX idx_deletion_requests_created_at ON deletion_requests(created_at DESC);

-- Add soft delete to declarations
ALTER TABLE declarations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_reason TEXT;

-- Index for active declarations only
CREATE INDEX IF NOT EXISTS idx_declarations_active ON declarations(deleted_at) 
WHERE deleted_at IS NULL;
