-- Migration: Add all 11 document types + AUTRES
-- Uses ON CONFLICT DO UPDATE to safely handle existing types

-- 1. CNI (already exists, update if needed)
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Carte Nationale d''Identité', 'CNI', 'Carte d''identité officielle nationale', 5000, 80, 20, 120, 'id-card', 'IDENTITE', 50)
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom, description = EXCLUDED.description, icone = EXCLUDED.icone,
  categorie = EXCLUDED.categorie, updated_at = CURRENT_TIMESTAMP;

-- 2. PASSPORT (already exists, update if needed)
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Passeport', 'PASSPORT', 'Passeport biométrique ou classique', 15000, 75, 25, 60, 'passport', 'IDENTITE', 100)
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom, description = EXCLUDED.description, icone = EXCLUDED.icone,
  categorie = EXCLUDED.categorie, updated_at = CURRENT_TIMESTAMP;

-- 3. CARTE SEJOUR
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Carte de Séjour', 'CARTE_SEJOUR', 'Carte de séjour pour étrangers au Cameroun', 6000, 80, 20, 24, 'stamp', 'IDENTITE', 75)
ON CONFLICT (code) DO NOTHING;

-- 4. CARTE VOTE
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Carte d''Électeur', 'CARTE_VOTE', 'Carte d''électeur / carte d''inscription sur les listes électorales', 3000, 80, 20, 0, 'check-to-slot', 'IDENTITE', 30)
ON CONFLICT (code) DO NOTHING;

-- 5. CARTE GRISE (already exists, update if needed)
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Carte Grise', 'CARTE_GRISE', 'Certificat d''immatriculation de véhicule', 7500, 80, 20, 12, 'car', 'TRANSPORT', 75)
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom, description = EXCLUDED.description, icone = EXCLUDED.icone,
  categorie = EXCLUDED.categorie, updated_at = CURRENT_TIMESTAMP;

-- 6. CARTE BLUE
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Carte Blue', 'CARTE_BLUE', 'Carte Blue de crédit ou de débit', 5000, 80, 20, 60, 'credit-card', 'TRANSPORT', 50)
ON CONFLICT (code) DO NOTHING;

-- 7. DIPLOME (already exists, update if needed)
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Diplôme', 'DIPLOME', 'Baccalauréat, Licence, Master, etc.', 10000, 70, 30, 0, 'graduation-cap', 'EDUCATION', 150)
ON CONFLICT (code) DO UPDATE SET
  nom = EXCLUDED.nom, description = EXCLUDED.description, icone = EXCLUDED.icone,
  categorie = EXCLUDED.categorie, updated_at = CURRENT_TIMESTAMP;

-- 8. TITRE FINANCIER
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Titre Foncier', 'TITRE_FINANCIER', 'Titre de propriété foncière', 12000, 70, 30, 0, 'house-chimney', 'FINANCE', 100)
ON CONFLICT (code) DO NOTHING;

-- 9. ACTE DE NAISSANCE
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Acte de Naissance', 'ACTE_NAISSANCE', 'Acte de naissance officiel', 3000, 80, 20, 0, 'file-lines', 'ETAT_CIVIL', 40)
ON CONFLICT (code) DO NOTHING;

-- 10. ACTE DE MARIAGE
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Acte de Mariage', 'ACTE_MARIAGE', 'Acte de mariage officiel', 4000, 80, 20, 0, 'ring', 'ETAT_CIVIL', 40)
ON CONFLICT (code) DO NOTHING;

-- 11. ACTE DE DECES
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Acte de Décès', 'ACTE_DECES', 'Acte de décès officiel', 3000, 80, 20, 0, 'scroll', 'ETAT_CIVIL', 40)
ON CONFLICT (code) DO NOTHING;

-- 12. AUTRES (type custom pour les utilisateurs)
INSERT INTO document_types (nom, code, description, prix_retrouvaille, finder_percent, app_percent, delai_expiration_mois, icone, categorie, points_recompense)
VALUES ('Autre (personnalisé)', 'AUTRES', 'Type de document non répertorié — l utilisateur peut saisir le nom personnalisé', 2000, 80, 20, 0, 'circle-question', 'AUTRES', 10)
ON CONFLICT (code) DO NOTHING;
