CREATE TABLE my_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number_imei VARCHAR(100),
    color VARCHAR(50),
    purchase_date DATE,
    purchase_value DECIMAL(15, 2),
    currency VARCHAR(10) DEFAULT 'XAF',
    where_buy VARCHAR(100),
    garantie_end DATE,
    photos JSONB,
    status VARCHAR(20) DEFAULT 'SAFE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id UUID REFERENCES declarations(id),
    owner_id UUID REFERENCES users(id),
    finder_id UUID REFERENCES users(id),
    verification_code VARCHAR(10),
    status VARCHAR(20) DEFAULT 'PENDING',
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);