-- Migration: Populate fields, color, and bg for existing document types

-- CNI
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom sur la CNI","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"numero","label":"Numéro CNI","icon":"barcode-outline","required":true,"placeholder":"109012345678"},{"key":"date_naissance","label":"Date de naissance","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"},{"key":"lieu_naissance","label":"Lieu de naissance","icon":"location-outline","required":false,"placeholder":"Yaoundé"},{"key":"date_delivrance","label":"Date de délivrance","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"},{"key":"date_expiration","label":"Date d''expiration","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"}]'::jsonb,
  color = '#F5A64B',
  bg = '#FEF3C7',
  icone = 'id-card-outline'
WHERE code = 'CNI';

-- PASSPORT
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom sur le passeport","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"numero","label":"Numéro de passeport","icon":"barcode-outline","required":true,"placeholder":"N0123456"},{"key":"date_naissance","label":"Date de naissance","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"},{"key":"date_expiration","label":"Date d''expiration","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"}]'::jsonb,
  color = '#2D5A42',
  bg = '#DCFCE7',
  icone = 'airplane-outline'
WHERE code = 'PASSPORT';

-- PERMIS
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom sur le permis","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"numero","label":"Numéro du permis","icon":"barcode-outline","required":true,"placeholder":"PC12345678"},{"key":"categorie","label":"Catégorie","icon":"list-outline","required":false,"placeholder":"A, B, C…"}]'::jsonb,
  color = '#3B82F6',
  bg = '#DBEAFE',
  icone = 'car-outline'
WHERE code = 'PERMIS';

-- ACTE_NAISSANCE
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom sur l’acte","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"numero","label":"Numéro d''acte","icon":"barcode-outline","required":true,"placeholder":"ACT-12345"},{"key":"date_naissance","label":"Date de naissance","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"},{"key":"lieu_naissance","label":"Lieu de naissance","icon":"location-outline","required":false,"placeholder":"Yaoundé"}]'::jsonb,
  color = '#EC4899',
  bg = '#FCE7F3',
  icone = 'document-text-outline'
WHERE code = 'ACTE_NAISSANCE';

-- CARTE_BLUE (banque)
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom sur la carte","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"banque_nom","label":"Nom de la banque","icon":"business-outline","required":false,"placeholder":"Afriland, BICEC…"},{"key":"numero","label":"4 derniers chiffres","icon":"barcode-outline","required":true,"placeholder":"**** **** **** 1234","keyboardType":"numeric"},{"key":"date_expiration","label":"Date d''expiration","icon":"calendar-outline","required":false,"placeholder":"AAAA-MM-JJ"}]'::jsonb,
  color = '#EF4444',
  bg = '#FEE2E2',
  icone = 'card-outline'
WHERE code = 'CARTE_BLUE';

-- TITRE_FINANCIER (titre)
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom du propriétaire","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"numero","label":"Numéro du titre","icon":"barcode-outline","required":true,"placeholder":"TF-12345"},{"key":"ville","label":"Ville","icon":"location-outline","required":false,"placeholder":"Douala"}]'::jsonb,
  color = '#F59E0B',
  bg = '#FEF3C7',
  icone = 'home-outline'
WHERE code = 'TITRE_FINANCIER';

-- DIPLOME
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom du lauréat","icon":"person-outline","required":true,"placeholder":"NOM Prénoms"},{"key":"intitule","label":"Intitulé du diplôme","icon":"ribbon-outline","required":true,"placeholder":"Licence en…"},{"key":"specialite","label":"Spécialité","icon":"book-outline","required":false,"placeholder":"Informatique"},{"key":"annee","label":"Année d''obtention","icon":"calendar-outline","required":false,"placeholder":"2024"}]'::jsonb,
  color = '#8B5CF6',
  bg = '#EDE9FE',
  icone = 'school-outline'
WHERE code = 'DIPLOME';

-- AUTRES (autre)
UPDATE document_types SET 
  fields = '[{"key":"titulaire","label":"Nom / intitulé du document","icon":"person-outline","required":true,"placeholder":"Ex: Carte d’étudiant"},{"key":"numero","label":"Numéro (si applicable)","icon":"barcode-outline","required":false,"placeholder":"Référence"},{"key":"description","label":"Description","icon":"document-text-outline","required":false,"multiline":true,"placeholder":"Décrivez le document (couleur, format, contenu visible)…"}]'::jsonb,
  color = '#6B7280',
  bg = '#F3F4F6',
  icone = 'cube-outline'
WHERE code = 'AUTRES';
