-- Migration 64: Add genre / gender field to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS genre VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN users.genre IS 'Genre / Sexe de l''utilisateur (HOMME, FEMME, AUTRE)';
