"""Recreate facebook_accounts and facebook_pages tables.

Revision ID: recreate_facebook_tables
Revises: e1f2a3b4c5d6
Create Date: 2026-06-01

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "recreate_facebook_tables"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make this migration idempotent: tables may already exist from the
    # earlier `094a57cf7b48` ("add_missing_tables_vehicles_products_oauth_sessions")
    # when the schema was created with `Base.metadata.create_all` instead of
    # running migrations from zero. Drop and recreate so the post-state matches
    # this migration's intent.
    op.execute("DROP TABLE IF EXISTS facebook_pages CASCADE")
    op.execute("DROP TABLE IF EXISTS facebook_accounts CASCADE")

    # Create facebook_accounts table
    op.create_table(
        "facebook_accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("seller_user_id", sa.UUID(), nullable=False),
        sa.Column("facebook_user_id", sa.String(255), nullable=False),
        sa.Column("facebook_name", sa.String(255), nullable=True),
        sa.Column("access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.String(1000), nullable=False, server_default=""),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("refresh_failure_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(["seller_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_facebook_accounts_seller_user_id", "facebook_accounts", ["seller_user_id"])
    op.create_index(
        "ix_facebook_accounts_facebook_user_id",
        "facebook_accounts",
        ["facebook_user_id"],
        unique=True,
    )
    op.create_index(
        "ix_facebook_accounts_token_expires_at", "facebook_accounts", ["token_expires_at"]
    )
    op.create_index("ix_facebook_accounts_status", "facebook_accounts", ["status"])

    # Create facebook_pages table
    op.create_table(
        "facebook_pages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("facebook_account_id", sa.UUID(), nullable=False),
        sa.Column("page_id", sa.String(255), nullable=False),
        sa.Column("page_name", sa.String(255), nullable=False),
        sa.Column("page_access_token_encrypted", sa.Text(), nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("picture_url", sa.String(500), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.ForeignKeyConstraint(
            ["facebook_account_id"], ["facebook_accounts.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_facebook_pages_facebook_account_id", "facebook_pages", ["facebook_account_id"]
    )
    op.create_index("ix_facebook_pages_page_id", "facebook_pages", ["page_id"])
    op.create_index("ix_facebook_pages_is_default", "facebook_pages", ["is_default"])


def downgrade() -> None:
    op.drop_table("facebook_pages")
    op.drop_table("facebook_accounts")
