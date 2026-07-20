-- Seed staging admin credentials
-- Email: admin@prosell.saas
-- Password: Admin123!
--
-- This runs on every staging deploy to ensure admin access is always available.
-- The password hash is bcrypt ($2b$12$...) generated from 'Admin123!'

-- Update existing admin or do nothing if not exists
UPDATE users
SET password_hash = '$2b$12$51TF1oOOQNXKheRWiX024u57ddFtcgko6GDloYclrV8cCfGR7JlnO'
WHERE email = 'admin@prosell.saas';
