"""recreate_users_table_complete

Revision ID: 20f24e79033e
Revises: 001
Create Date: 2026-03-24 08:28:17.569908

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20f24e79033e"
down_revision: str | Sequence[str] | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Recreate users table with complete schema."""
    # Drop existing table (CASCADE to handle foreign keys)
    op.execute("DROP TABLE IF EXISTS users CASCADE")

    # Create complete users table
    op.execute("""
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
        )
    """)

    # Create indexes
    op.execute("CREATE INDEX ix_users_email ON users(email)")
    op.execute("CREATE INDEX ix_users_status ON users(status)")
    op.execute("CREATE INDEX ix_users_email_verified ON users(email_verified)")
    op.execute("CREATE INDEX ix_users_tenant_id ON users(tenant_id)")

    # Insert test user (already exists in oauth_accounts from previous OAuth login)
    op.execute("""
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
        )
    """)


def downgrade() -> None:
    """Downgrade schema - Drop users table."""
    op.execute("DROP TABLE IF EXISTS users CASCADE")
