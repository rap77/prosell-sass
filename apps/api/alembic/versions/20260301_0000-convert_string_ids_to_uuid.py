"""Convert String IDs to UUID

Converts id columns from VARCHAR to UUID for proper type safety.

Revision ID: a1b2c3d4e5f6
Revises: 2a3b4c5d6e7f
Create Date: 2026-03-01 23:30:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "2a3b4c5d6e7f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema: Convert VARCHAR IDs to UUID."""

    # ========================================================================
    # USERS TABLE
    # ========================================================================
    # Convert tenant_id first (no dependencies)
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN tenant_id
        DROP NOT NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN tenant_id
        TYPE UUID USING tenant_id::UUID;
        """
    )

    # Convert id (needs special handling for primary key)
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )

    # ========================================================================
    # ROLES TABLE
    # ========================================================================
    # Convert tenant_id first
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN tenant_id
        DROP NOT NULL;
        """
    )
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN tenant_id
        TYPE UUID USING tenant_id::UUID;
        """
    )

    # Convert id
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )

    # ========================================================================
    # USER_ROLES TABLE (junction table)
    # ========================================================================
    # Drop foreign keys first
    op.execute(
        """
        ALTER TABLE user_roles
        DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
        """
    )

    # Convert columns
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN id
        TYPE UUID USING id::UUID;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN user_id
        TYPE UUID USING user_id::UUID;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN role_id
        TYPE UUID USING role_id::UUID;
        """
    )

    # Recreate foreign keys with UUID types
    op.execute(
        """
        ALTER TABLE user_roles
        ADD CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ADD CONSTRAINT user_roles_role_id_fkey
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
        """
    )


def downgrade() -> None:
    """Downgrade schema: Convert UUID IDs back to VARCHAR."""

    # ========================================================================
    # USER_ROLES TABLE
    # ========================================================================
    # Drop foreign keys
    op.execute(
        """
        ALTER TABLE user_roles
        DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
        """
    )

    # Convert back to VARCHAR
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN user_id
        TYPE VARCHAR USING user_id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ALTER COLUMN role_id
        TYPE VARCHAR USING role_id::TEXT;
        """
    )

    # Recreate foreign keys
    op.execute(
        """
        ALTER TABLE user_roles
        ADD CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        """
    )
    op.execute(
        """
        ALTER TABLE user_roles
        ADD CONSTRAINT user_roles_role_id_fkey
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
        """
    )

    # ========================================================================
    # ROLES TABLE
    # ========================================================================
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN tenant_id
        TYPE VARCHAR USING tenant_id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE roles
        ALTER COLUMN tenant_id
        SET NOT NULL;
        """
    )

    # ========================================================================
    # USERS TABLE
    # ========================================================================
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN id
        TYPE VARCHAR USING id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN tenant_id
        TYPE VARCHAR USING tenant_id::TEXT;
        """
    )
    op.execute(
        """
        ALTER TABLE users
        ALTER COLUMN tenant_id
        SET NOT NULL;
        """
    )
