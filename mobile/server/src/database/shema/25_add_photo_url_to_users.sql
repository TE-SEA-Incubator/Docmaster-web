-- Migration: Add photo_url to users table
-- Description: Adds a column to store the profile picture URL for users.

ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN users.photo_url IS 'URL of the user profile picture stored in uploads/profiles';
