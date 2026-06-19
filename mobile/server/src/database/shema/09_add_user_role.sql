ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'USER';
-- Set initial admin (optional, I'll do it manually or via query if needed)
-- UPDATE users SET role = 'ADMIN' WHERE email = 'admin@docmaster.com';
