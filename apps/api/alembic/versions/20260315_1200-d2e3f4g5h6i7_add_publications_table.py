"""Add publications table for FB Marketplace listing lifecycle tracking

Revision ID: d2e3f4g5h6i7
Revises: c1d2e3f4g5h6
Create Date: 2026-03-15 12:00:00.000000

Creates the publications table which tracks each Facebook Marketplace listing
attempt from pending through published/failed/expired/sold states.

State machine: pending -> publishing -> published -> failed/expired/sold
Scheduler uses expires_at index to find listings approaching 7-day FB expiry.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d2e3f4g5h6i7"
down_revision: str | Sequence[str] | None = "c1d2e3f4g5h6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create publications table."""
    op.create_table(
        "publications",
        # Primary key
        sa.Column("id", sa.Uuid(), nullable=False),
        # Tenant and ownership
        sa.Column("tenant_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("seller_user_id", sa.Uuid(), nullable=True),
        sa.Column("facebook_page_id", sa.Uuid(), nullable=True),
        # Publication state machine
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("strategy_used", sa.String(50), nullable=True),
        sa.Column("engine_version", sa.String(100), nullable=True),
        sa.Column("fb_listing_id", sa.String(255), nullable=True),
        # Listing content
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("zip_code", sa.String(20), nullable=False),
        sa.Column("image_urls", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("hero_shot_url", sa.String(500), nullable=True),
        # Lifecycle timestamps
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sold_at", sa.DateTime(timezone=True), nullable=True),
        # Error tracking
        sa.Column("error_category", sa.String(50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("blocked_until_confirmed", sa.Boolean(), nullable=False, server_default="false"),
        # Audit timestamps
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
        # Primary key
        sa.PrimaryKeyConstraint("id"),
        # Foreign keys
        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["seller_user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["facebook_page_id"],
            ["facebook_pages.id"],
            ondelete="SET NULL",
        ),
    )

    # Indexes for common query patterns
    op.create_index("ix_publications_tenant_id", "publications", ["tenant_id"])
    op.create_index("ix_publications_product_id", "publications", ["product_id"])
    op.create_index("ix_publications_seller_user_id", "publications", ["seller_user_id"])
    op.create_index("ix_publications_facebook_page_id", "publications", ["facebook_page_id"])
    op.create_index("ix_publications_status", "publications", ["status"])
    op.create_index("ix_publications_fb_listing_id", "publications", ["fb_listing_id"])
    # Critical: scheduler queries expires_at to find approaching-expiry listings
    op.create_index("ix_publications_expires_at", "publications", ["expires_at"])


def downgrade() -> None:
    """Drop publications table."""
    op.drop_index("ix_publications_expires_at", table_name="publications")
    op.drop_index("ix_publications_fb_listing_id", table_name="publications")
    op.drop_index("ix_publications_status", table_name="publications")
    op.drop_index("ix_publications_facebook_page_id", table_name="publications")
    op.drop_index("ix_publications_seller_user_id", table_name="publications")
    op.drop_index("ix_publications_product_id", table_name="publications")
    op.drop_index("ix_publications_tenant_id", table_name="publications")
    op.drop_table("publications")
