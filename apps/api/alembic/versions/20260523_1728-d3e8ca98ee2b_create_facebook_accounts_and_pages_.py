"""create_facebook_accounts_and_pages_tables

Revision ID: d3e8ca98ee2b
Revises: f2a3b4c5d6e7
Create Date: 2026-05-23 17:28:22.468303

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3e8ca98ee2b"
down_revision: str | Sequence[str] | None = "f2a3b4c5d6e7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "facebook_accounts",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "seller_user_id",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("facebook_user_id", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("facebook_name", sa.String(255), nullable=True),
        sa.Column("access_token_encrypted", sa.Text, nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True, index=True),
        sa.Column("scopes", sa.String(1000), server_default="", nullable=False),
        sa.Column("status", sa.String(50), server_default="active", nullable=False, index=True),
        sa.Column("refresh_failure_count", sa.Integer, server_default="0", nullable=False),
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
    )

    op.create_table(
        "facebook_pages",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "facebook_account_id",
            sa.UUID(),
            sa.ForeignKey("facebook_accounts.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("page_id", sa.String(255), nullable=False, index=True),
        sa.Column("page_name", sa.String(255), nullable=False),
        sa.Column("page_access_token_encrypted", sa.Text, nullable=False),
        sa.Column("category", sa.String(255), nullable=True),
        sa.Column("picture_url", sa.String(500), nullable=True),
        sa.Column("is_default", sa.Boolean, server_default="false", nullable=False, index=True),
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
    )


def downgrade() -> None:
    op.drop_table("facebook_pages")
    op.drop_table("facebook_accounts")
