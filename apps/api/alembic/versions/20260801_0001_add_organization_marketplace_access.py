"""Add explicit dealer-to-operator marketplace access.

Revision ID: 20260801_0001
Revises: 20260730_0002
Create Date: 2026-08-01
"""

import sqlalchemy as sa
from alembic import op

revision = "20260801_0001"
down_revision = "20260730_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_marketplace_access",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("inventory_owner_organization_id", sa.UUID(), nullable=False),
        sa.Column("operator_organization_id", sa.UUID(), nullable=False),
        sa.Column(
            "can_manage_inventory",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "can_publish_marketplace",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inventory_owner_organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["operator_organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "inventory_owner_organization_id",
            "operator_organization_id",
            name="uq_marketplace_access_owner_operator",
        ),
    )
    op.create_index(
        "ix_marketplace_access_inventory_owner",
        "organization_marketplace_access",
        ["inventory_owner_organization_id"],
    )
    op.create_index(
        "ix_marketplace_access_operator",
        "organization_marketplace_access",
        ["operator_organization_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_marketplace_access_operator")
    op.drop_index("ix_marketplace_access_inventory_owner")
    op.drop_table("organization_marketplace_access")
