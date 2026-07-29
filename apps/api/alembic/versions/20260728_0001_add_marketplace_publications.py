"""Add marketplace_publications table for FB sync tracking.

Revision ID: 20260728_0001
Revises: c8a7e1f93b21
Create Date: 2026-07-28
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260728_0001"
down_revision = "20260719_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marketplace_publications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False, server_default="facebook"),
        sa.Column("account_email", sa.String(255), nullable=False),
        sa.Column("account_alias", sa.String(100), nullable=True),
        sa.Column("fb_groups", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column("fb_post_id", sa.String(100), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_renewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("renewal_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
    )

    op.create_index(
        "ix_marketplace_publications_product_id",
        "marketplace_publications",
        ["product_id"],
    )
    op.create_index(
        "ix_marketplace_publications_status",
        "marketplace_publications",
        ["status"],
    )
    op.create_index(
        "ix_marketplace_publications_expires_at",
        "marketplace_publications",
        ["expires_at"],
    )
    op.create_index(
        "ix_marketplace_publications_tenant_id",
        "marketplace_publications",
        ["tenant_id"],
    )
    op.create_index(
        "ix_marketplace_publications_account_email",
        "marketplace_publications",
        ["account_email"],
    )
    # ponytail: composite index for the pending query
    op.create_index(
        "ix_marketplace_publications_account_status",
        "marketplace_publications",
        ["account_email", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_marketplace_publications_account_status")
    op.drop_index("ix_marketplace_publications_account_email")
    op.drop_index("ix_marketplace_publications_tenant_id")
    op.drop_index("ix_marketplace_publications_expires_at")
    op.drop_index("ix_marketplace_publications_status")
    op.drop_index("ix_marketplace_publications_product_id")
    op.drop_table("marketplace_publications")
