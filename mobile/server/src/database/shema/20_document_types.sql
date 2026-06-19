-- Create document_types table
CREATE TABLE document_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    prix_retrouvaille DECIMAL(15, 2) DEFAULT 0.00,
    finder_percent DECIMAL(5, 2) DEFAULT 80.00,
    app_percent DECIMAL(5, 2) DEFAULT 20.00,
    delai_expiration_mois INTEGER DEFAULT 0,
    icone VARCHAR(100) DEFAULT 'file-lines',
    categorie VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial document types
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie)
VALUES 
('Carte Nationale d''Identité', 'CNI', 'Carte d''identité officielle nationale', 5000, 80, 20, 120, 'id-card', 'IDENTITE'),
('Passeport', 'PASSPORT', 'Passeport biométrique ou classique', 15000, 75, 25, 60, 'passport', 'IDENTITE'),
('Carte Grise', 'CARTE_GRISE', 'Certificat d''immatriculation de véhicule', 7500, 80, 20, 12, 'car', 'TRANSPORT'),
('Permis de Conduire', 'PERMIS', 'Permis de conduire toutes catégories', 5000, 80, 20, 60, 'id-badge', 'TRANSPORT'),
('Diplôme', 'DIPLOME', 'Baccalauréat, Licence, Master, etc.', 10000, 70, 30, 0, 'graduation-cap', 'EDUCATION');
