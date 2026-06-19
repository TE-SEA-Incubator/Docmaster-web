-- Table for global application settings
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default settings
INSERT INTO app_settings (key, value, description)
VALUES 
('min_withdrawal_amount', '500', 'Le montant minimum en XAF pour effectuer un retrait'),
('points_per_declaration', '5', 'Points attribués pour chaque signalement de document'),
('referral_points_parrain', '10', 'Points attribués au parrain lors de l''inscription d''un filleul')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
