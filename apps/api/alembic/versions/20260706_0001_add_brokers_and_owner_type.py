"""Add organization_brokers table and owner_type to product_ownership.

Revision ID: 20260706_0001
Revises: 20260705_0001_add_product_ownership
Create Date: 2026-07-06

Brokers are users associated with an organization who can own products.
If an org has no brokers, the org itself is the owner. If it has brokers,
products are owned by individual brokers with percentage shares.
"""

import sqlalchemy as sa
from alembic import op

revision = "add_brokers_20260706"
down_revision = "add_product_ownership_20260705"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # organization_brokers M2M table
    op.create_table(
        "organization_brokers",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("organization_id", "user_id"),
    )
    op.create_index(
        "ix_organization_brokers_user_id",
        "organization_brokers",
        ["user_id"],
    )

    # owner_type discriminator on product_ownership
    op.add_column(
        "product_ownership",
        sa.Column(
            "owner_type",
            sa.String(20),
            server_default="organization",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("product_ownership", "owner_type")
    op.drop_index("ix_organization_brokers_user_id", "organization_brokers")
    op.drop_table("organization_brokers")
