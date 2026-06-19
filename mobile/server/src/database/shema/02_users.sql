CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telephone VARCHAR(20) UNIQUE,
    mot_de_passe TEXT NOT NULL,
    pays VARCHAR(100) DEFAULT 'Cameroun',
    ville VARCHAR(100) DEFAULT 'Yaoundé',
    is_verified BOOLEAN DEFAULT false,
    code_invitation VARCHAR(20) UNIQUE,
    parrain_id UUID REFERENCES users(id), -- Auto-référence pour le parrainage
    points INTEGER DEFAULT 0,
    wallet_balance DECIMAL(15, 2) DEFAULT 0.00, -- Utilisation de DECIMAL pour la monnaie
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);