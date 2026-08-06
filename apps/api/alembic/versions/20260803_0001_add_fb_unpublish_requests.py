"""Add durable Facebook unpublish request queue.

Revision ID: 20260803_0001
Revises: 20260802_0001
Create Date: 2026-08-03
"""

import sqlalchemy as sa
from alembic import op

revision = "20260803_0001"
down_revision = "20260802_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fb_unpublish_requests",
        sa.Column("id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("publication_status_id", sa.UUID(), nullable=False),
        sa.Column("fb_account_id", sa.UUID(), nullable=False),
        sa.Column("fb_post_id", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["publication_status_id"], ["fb_publication_status.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["fb_account_id"], ["fb_accounts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "publication_status_id", name="uq_fb_unpublish_requests_publication_status"
        ),
    )
    op.create_index("ix_fb_unpublish_requests_tenant_id", "fb_unpublish_requests", ["tenant_id"])
    op.create_index("ix_fb_unpublish_requests_product_id", "fb_unpublish_requests", ["product_id"])
    op.create_index(
        "ix_fb_unpublish_requests_fb_account_id", "fb_unpublish_requests", ["fb_account_id"]
    )
    op.create_index("ix_fb_unpublish_requests_status", "fb_unpublish_requests", ["status"])


def downgrade() -> None:
    op.drop_index("ix_fb_unpublish_requests_status")
    op.drop_index("ix_fb_unpublish_requests_fb_account_id")
    op.drop_index("ix_fb_unpublish_requests_product_id")
    op.drop_index("ix_fb_unpublish_requests_tenant_id")
    op.drop_table("fb_unpublish_requests")
