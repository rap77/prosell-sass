"""convert oauth_accounts, sessions, user_tokens to UUID

Revision ID: 57b3e7cdea3c
Revises: a1b2c3d4e5f6
Create Date: 2026-03-01 21:17:24.328223

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "57b3e7cdea3c"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema: Convert oauth_accounts, sessions, user_tokens IDs to UUID."""

    # ========================================================================
    # OAUTH_ACCOUNTS TABLE
    # ========================================================================
    # Drop foreign key first
    op.execute(
        """
        ALTER TABLE oauth_accounts
        DROP CONSTRAINT IF EXISTS oauth_accounts_user_id_fkey;
        """
    )

    # Convert columns
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ALTER COLUMN user_id
        TYPE UUID USING user_id::UUID;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ADD CONSTRAINT oauth_accounts_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )

    # ========================================================================
    # SESSIONS TABLE
    # ========================================================================
    # Drop foreign key first
    op.execute(
        """
        ALTER TABLE sessions
        DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
        """
    )

    # Convert columns
    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )
    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN user_id
        TYPE UUID USING user_id::UUID;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE sessions
        ADD CONSTRAINT sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )

    # ========================================================================
    # USER_TOKENS TABLE
    # ========================================================================
    # Drop foreign key first
    op.execute(
        """
        ALTER TABLE user_tokens
        DROP CONSTRAINT IF EXISTS user_tokens_user_id_fkey;
        """
    )

    # Convert columns
    op.execute(
        """
        ALTER TABLE user_tokens
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )
    op.execute(
        """
        ALTER TABLE user_tokens
        ALTER COLUMN user_id
        TYPE UUID USING user_id::UUID;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE user_tokens
        ADD CONSTRAINT user_tokens_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )


def downgrade() -> None:
    """Downgrade schema: Convert UUID IDs back to VARCHAR."""

    # ========================================================================
    # OAUTH_ACCOUNTS TABLE
    # ========================================================================
    # Drop foreign key
    op.execute(
        """
        ALTER TABLE oauth_accounts
        DROP CONSTRAINT IF EXISTS oauth_accounts_user_id_fkey;
        """
    )

    # Convert back to VARCHAR
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ALTER COLUMN user_id
        TYPE VARCHAR USING user_id::TEXT;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE oauth_accounts
        ADD CONSTRAINT oauth_accounts_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )

    # ========================================================================
    # SESSIONS TABLE
    # ========================================================================
    # Drop foreign key
    op.execute(
        """
        ALTER TABLE sessions
        DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
        """
    )

    # Convert back to VARCHAR
    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE sessions
        ALTER COLUMN user_id
        TYPE VARCHAR USING user_id::TEXT;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE sessions
        ADD CONSTRAINT sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )

    # ========================================================================
    # USER_TOKENS TABLE
    # ========================================================================
    # Drop foreign key
    op.execute(
        """
        ALTER TABLE user_tokens
        DROP CONSTRAINT IF EXISTS user_tokens_user_id_fkey;
        """
    )

    # Convert back to VARCHAR
    op.execute(
        """
        ALTER TABLE user_tokens
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE user_tokens
        ALTER COLUMN user_id
        TYPE VARCHAR USING user_id::TEXT;
        """
    )

    # Recreate foreign key
    op.execute(
        """
        ALTER TABLE user_tokens
        ADD CONSTRAINT user_tokens_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )
