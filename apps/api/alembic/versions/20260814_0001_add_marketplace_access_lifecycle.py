"""Add lifecycle and audit fields to organization_marketplace_access.

Revision ID: 20260814_0001
Revises: 20260812_0002
Create Date: 2026-08-14
"""

import sqlalchemy as sa
from alembic import op

revision = "20260814_0001"
down_revision = "20260812_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user reference columns for audit trail
    op.add_column(
        "organization_marketplace_access",
        sa.Column("requested_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("approved_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("rejected_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("revoked_by_user_id", sa.UUID(), nullable=True),
    )

    # Add reason fields
    op.add_column(
        "organization_marketplace_access",
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("revocation_reason", sa.Text(), nullable=True),
    )

    # Add timestamp fields
    op.add_column(
        "organization_marketplace_access",
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organization_marketplace_access",
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Add foreign key constraints
    op.create_foreign_key(
        "fk_marketplace_access_requested_by_user",
        "organization_marketplace_access",
        "users",
        ["requested_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_marketplace_access_approved_by_user",
        "organization_marketplace_access",
        "users",
        ["approved_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_marketplace_access_rejected_by_user",
        "organization_marketplace_access",
        "users",
        ["rejected_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_marketplace_access_revoked_by_user",
        "organization_marketplace_access",
        "users",
        ["revoked_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Update existing rows to have requested_at = created_at
    op.execute(
        "UPDATE organization_marketplace_access SET requested_at = created_at "
        "WHERE requested_at IS NULL"
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_marketplace_access_revoked_by_user",
        "organization_marketplace_access",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_marketplace_access_rejected_by_user",
        "organization_marketplace_access",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_marketplace_access_approved_by_user",
        "organization_marketplace_access",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_marketplace_access_requested_by_user",
        "organization_marketplace_access",
        type_="foreignkey",
    )

    op.drop_column("organization_marketplace_access", "revoked_at")
    op.drop_column("organization_marketplace_access", "rejected_at")
    op.drop_column("organization_marketplace_access", "approved_at")
    op.drop_column("organization_marketplace_access", "requested_at")
    op.drop_column("organization_marketplace_access", "revocation_reason")
    op.drop_column("organization_marketplace_access", "rejection_reason")
    op.drop_column("organization_marketplace_access", "revoked_by_user_id")
    op.drop_column("organization_marketplace_access", "rejected_by_user_id")
    op.drop_column("organization_marketplace_access", "approved_by_user_id")
    op.drop_column("organization_marketplace_access", "requested_by_user_id")
