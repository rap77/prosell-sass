-- Drop and recreate users table with complete schema
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    email_verified_at TIMESTAMPTZ,
    is_2fa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    totp_secret VARCHAR(255),
    backup_codes TEXT,
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_status ON users(status);
CREATE INDEX ix_users_email_verified ON users(email_verified);
CREATE INDEX ix_users_tenant_id ON users(tenant_id);

-- Insert test user (already exists in oauth_accounts)
INSERT INTO users (
    id, email, full_name, avatar_url, status,
    email_verified, tenant_id
) VALUES (
    'e1871fb7-cf0e-4374-a4ff-89809adffc4e',
    'rafael.padron@gmail.com',
    'Rafael Padron',
    'https://lh3.googleusercontent.com/a/default-user=s96-c',
    'active',
    TRUE,
    'e1871fb7-cf0e-4374-a4ff-89809adffc4e'
);

-- Verify
SELECT 'Users table created successfully!' AS status;
SELECT COUNT(*) AS user_count FROM users;
