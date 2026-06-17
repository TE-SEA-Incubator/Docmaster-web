-- Add expiration management feature definitions
INSERT INTO feature_definitions (code, label, type, description) VALUES
('expiration_management', 'Gestion des dates d''expiration', 'boolean', 'Permet de définir une date d''expiration sur les documents (Option A)'),
('expiration_reminders', 'Rappels d''expiration par email', 'boolean', 'Envoie des rappels par email avant l''expiration des documents (J-7, J-3, J-1)'),
('auto_archive', 'Archivage automatique', 'boolean', 'Archive automatiquement les documents arrivés à expiration')
ON CONFLICT (code) DO NOTHING;
