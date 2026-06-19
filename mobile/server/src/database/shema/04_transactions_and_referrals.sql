CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'XAF',
    status VARCHAR(20),
    payment_method VARCHAR(50),
    external_ref VARCHAR(100),
    type VARCHAR(50), -- 'declarat_fee', 'subscription', etc.
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parrain_id UUID REFERENCES users(id),
    filleul_id UUID REFERENCES users(id),
    points_gagnes INTEGER,
    status VARCHAR(20) DEFAULT 'VALIDATED',
    recompense_attribuee BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);