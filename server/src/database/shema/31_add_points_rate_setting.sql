-- Migration: Add points to XAF exchange rate setting
INSERT INTO app_settings (key, value, description)
VALUES ('points_to_xaf_rate', '10', 'Nombre de points pour 1 XAF (ex: 10 signifie 10 points = 1 XAF)')
ON CONFLICT (key) DO NOTHING;
