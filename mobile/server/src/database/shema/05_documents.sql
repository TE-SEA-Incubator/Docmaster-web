CREATE TABLE my_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type_doc VARCHAR(50),
    numero_doc VARCHAR(100),
    nom_sur_doc TEXT,
    date_expiration DATE,
    fingerprint TEXT, -- Hash pour comparer les documents sans voir l'image
    photo_recto TEXT,
    photo_verso TEXT,
    is_protected BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE declarations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifiant_doc_dm VARCHAR(50) UNIQUE, -- Ton ID formaté (ex: DM-2318)
    doc_type VARCHAR(50) NOT NULL,
    owner_name TEXT NOT NULL,
    document_number VARCHAR(100),
    declaration_type VARCHAR(20) NOT NULL, -- 'LOST' ou 'FOUND'
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    reporter_id UUID REFERENCES users(id),
    ville VARCHAR(100),
    region VARCHAR(100),
    pays VARCHAR(100),
    fingerprint TEXT,
    found_location JSONB, -- {city, lat, long}
    etat_physique VARCHAR(50),
    photo_recto TEXT,
    photo_verso TEXT,
    description TEXT,
    date_expiration DATE,
    mode_contact VARCHAR(50) DEFAULT 'APP_CHAT',
    payment_status VARCHAR(20) DEFAULT 'PENDING',
    transactions_id UUID REFERENCES transactions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);