"""Add fb_publication_history and fb_publication_status tables.

Revision ID: 20260730_0002
Revises: 20260730_0001
Create Date: 2026-07-30
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260730_0002"
down_revision = "20260730_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    _now = sa.text("now()")
    _uuid_default = sa.text("gen_random_uuid()")
    _history_table = "fb_publication_history"

    # fb_publication_history: immutable event log
    op.create_table(
        _history_table,
        sa.Column("id", sa.UUID(), nullable=False, server_default=_uuid_default),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("fb_account_id", sa.UUID(), nullable=False),
        # event_type: published, failed, deleted, expired, republished
        sa.Column("event_type", sa.String(20), nullable=False),
        sa.Column("fb_post_id", sa.String(100), nullable=True),
        sa.Column("fb_groups_posted", postgresql.JSONB(), nullable=True),
        sa.Column("groups_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("event_at", sa.DateTime(timezone=True), nullable=False, server_default=_now),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("publication_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("previous_publication_id", sa.UUID(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fb_account_id"], ["fb_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["previous_publication_id"], [_history_table + ".id"], ondelete="SET NULL"
        ),
    )
    op.create_index("ix_fb_pub_history_product", "fb_publication_history", ["product_id"])
    op.create_index("ix_fb_pub_history_account", "fb_publication_history", ["fb_account_id"])
    op.create_index("ix_fb_pub_history_event_at", "fb_publication_history", ["event_at"])
    op.create_index("ix_fb_pub_history_tenant", "fb_publication_history", ["tenant_id"])

    # fb_publication_status: consolidated current state per product+account
    op.create_table(
        "fb_publication_status",
        sa.Column("id", sa.UUID(), nullable=False, server_default=_uuid_default),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("fb_account_id", sa.UUID(), nullable=False),
        # status: pending, active, deleted, expired, failed
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("last_event_id", sa.UUID(), nullable=True),
        sa.Column("last_event_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("publication_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("first_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["tenant_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["fb_account_id"], ["fb_accounts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_event_id"], [_history_table + ".id"], ondelete="SET NULL"),
        sa.UniqueConstraint("product_id", "fb_account_id", name="uq_fb_pub_status_product_account"),
    )
    op.create_index("ix_fb_pub_status_product", "fb_publication_status", ["product_id"])
    op.create_index("ix_fb_pub_status_account", "fb_publication_status", ["fb_account_id"])
    op.create_index("ix_fb_pub_status_status", "fb_publication_status", ["status"])
    op.create_index("ix_fb_pub_status_tenant", "fb_publication_status", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_fb_pub_status_tenant")
    op.drop_index("ix_fb_pub_status_status")
    op.drop_index("ix_fb_pub_status_account")
    op.drop_index("ix_fb_pub_status_product")
    op.drop_table("fb_publication_status")

    op.drop_index("ix_fb_pub_history_tenant")
    op.drop_index("ix_fb_pub_history_event_at")
    op.drop_index("ix_fb_pub_history_account")
    op.drop_index("ix_fb_pub_history_product")
    op.drop_table("fb_publication_history")
