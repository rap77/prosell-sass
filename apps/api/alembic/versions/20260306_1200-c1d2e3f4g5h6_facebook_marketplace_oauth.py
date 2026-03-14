"""Facebook Marketplace OAuth: facebook_accounts and facebook_pages tables

Revision ID: c1d2e3f4g5h6
Revises: b4c5d6e7f8a0
Create Date: 2026-03-06 12:00:00.000000

This migration creates the schema for Facebook Marketplace integration:
- facebook_accounts (vendedor's connected Facebook accounts)
- facebook_pages (Facebook pages for publishing)
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c1d2e3f4g5h6"
down_revision: str | Sequence[str] | None = "b4c5d6e7f8a0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""

    # ========================================================================
    # FACEBOOK_ACCOUNTS TABLE
    # Vendedor's connected Facebook accounts for Marketplace publishing
    # ========================================================================
    op.create_table(
        "facebook_accounts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("seller_user_id", sa.Uuid(), nullable=False),
        sa.Column("facebook_user_id", sa.String(length=255), nullable=False),
        sa.Column("facebook_name", sa.String(length=255), nullable=True),
        sa.Column("access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.String(length=1000), server_default="", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="active", nullable=False),
        sa.Column("refresh_failure_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(["seller_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("facebook_user_id"),
    )

    # Indexes for facebook_accounts
    op.create_index(
        op.f("ix_facebook_accounts_seller_user_id"),
        "facebook_accounts",
        ["seller_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_facebook_accounts_facebook_user_id"),
        "facebook_accounts",
        ["facebook_user_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_facebook_accounts_token_expires_at"),
        "facebook_accounts",
        ["token_expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_facebook_accounts_status"), "facebook_accounts", ["status"], unique=False
    )

    # ========================================================================
    # FACEBOOK_PAGES TABLE
    # Facebook pages for publishing listings
    # ========================================================================
    op.create_table(
        "facebook_pages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("facebook_account_id", sa.Uuid(), nullable=False),
        sa.Column("page_id", sa.String(length=255), nullable=False),
        sa.Column("page_name", sa.String(length=255), nullable=False),
        sa.Column("page_access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=True),
        sa.Column("picture_url", sa.String(length=500), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Foreign keys
        sa.ForeignKeyConstraint(
            ["facebook_account_id"], ["facebook_accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Indexes for facebook_pages
    op.create_index(
        op.f("ix_facebook_pages_facebook_account_id"),
        "facebook_pages",
        ["facebook_account_id"],
        unique=False,
    )
    op.create_index(op.f("ix_facebook_pages_page_id"), "facebook_pages", ["page_id"], unique=False)
    op.create_index(
        op.f("ix_facebook_pages_is_default"), "facebook_pages", ["is_default"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""

    # Drop tables in reverse order (due to foreign key constraints)
    op.drop_index(op.f("ix_facebook_pages_is_default"), table_name="facebook_pages")
    op.drop_index(op.f("ix_facebook_pages_page_id"), table_name="facebook_pages")
    op.drop_index(op.f("ix_facebook_pages_facebook_account_id"), table_name="facebook_pages")
    op.drop_table("facebook_pages")

    op.drop_index(op.f("ix_facebook_accounts_status"), table_name="facebook_accounts")
    op.drop_index(op.f("ix_facebook_accounts_token_expires_at"), table_name="facebook_accounts")
    op.drop_index(op.f("ix_facebook_accounts_facebook_user_id"), table_name="facebook_accounts")
    op.drop_index(op.f("ix_facebook_accounts_seller_user_id"), table_name="facebook_accounts")
    op.drop_table("facebook_accounts")
