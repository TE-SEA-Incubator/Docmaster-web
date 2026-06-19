CREATE TABLE plans (
    id VARCHAR(50) PRIMARY KEY, -- ex: 'premium_gold'
    name VARCHAR(100) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    interval VARCHAR(20), -- 'month', 'year'
    features JSONB, -- Stockage flexible des fonctionnalités
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES plans(id),
    date_debut TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    date_fin TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    auto_renew BOOLEAN DEFAULT false,
    avantages_restants JSONB
);