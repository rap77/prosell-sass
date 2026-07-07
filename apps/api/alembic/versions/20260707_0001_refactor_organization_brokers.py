"""Refactor organization_brokers to support non-user brokers.

Revision ID: refactor_brokers_20260707
Revises: drop_owner_id_fk_20260706
Create Date: 2026-07-07

Changes:
- Add id (UUID) as new primary key
- Add name, email columns
- Add status column (pending/verified)
- Add verified_at column
- Make user_id nullable (filled when broker accepts invitation)
- Drop composite PK, add new PK on id
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "refactor_brokers_20260707"
down_revision = "drop_owner_id_fk_20260706"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Step 1: Add new columns
    op.add_column(
        "organization_brokers",
        sa.Column(
            "id", UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
    )
    op.add_column(
        "organization_brokers",
        sa.Column("name", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "organization_brokers",
        sa.Column("email", sa.String(255), nullable=False, server_default=""),
    )
    op.add_column(
        "organization_brokers",
        sa.Column("status", sa.String(20), nullable=False, server_default="verified"),
    )
    op.add_column(
        "organization_brokers",
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Step 2: Populate name/email from existing users
    op.execute("""
        UPDATE organization_brokers ob
        SET name = u.full_name,
            email = u.email,
            verified_at = ob.created_at
        FROM users u
        WHERE ob.user_id = u.id
    """)

    # Step 3: Remove server defaults (were just for migration)
    op.alter_column("organization_brokers", "name", server_default=None)
    op.alter_column("organization_brokers", "email", server_default=None)
    op.alter_column("organization_brokers", "status", server_default=None)

    # Step 4: Drop old composite primary key
    op.drop_constraint("organization_brokers_pkey", "organization_brokers", type_="primary")

    # Step 5: Make user_id nullable
    op.alter_column("organization_brokers", "user_id", nullable=True)

    # Step 6: Add new primary key on id
    op.create_primary_key("organization_brokers_pkey", "organization_brokers", ["id"])

    # Step 7: Add unique constraint on (organization_id, email)
    op.create_unique_constraint(
        "uq_organization_brokers_org_email",
        "organization_brokers",
        ["organization_id", "email"],
    )

    # Step 8: Add index on email for lookups
    op.create_index("ix_organization_brokers_email", "organization_brokers", ["email"])


def downgrade() -> None:
    # Remove new indexes/constraints
    op.drop_index("ix_organization_brokers_email", "organization_brokers")
    op.drop_constraint("uq_organization_brokers_org_email", "organization_brokers", type_="unique")

    # Restore old PK
    op.drop_constraint("organization_brokers_pkey", "organization_brokers", type_="primary")

    # Delete rows without user_id (can't restore composite PK with nulls)
    op.execute("DELETE FROM organization_brokers WHERE user_id IS NULL")

    # Make user_id non-nullable again
    op.alter_column("organization_brokers", "user_id", nullable=False)

    # Restore composite PK
    op.create_primary_key(
        "organization_brokers_pkey",
        "organization_brokers",
        ["organization_id", "user_id"],
    )

    # Drop new columns
    op.drop_column("organization_brokers", "verified_at")
    op.drop_column("organization_brokers", "status")
    op.drop_column("organization_brokers", "email")
    op.drop_column("organization_brokers", "name")
    op.drop_column("organization_brokers", "id")
