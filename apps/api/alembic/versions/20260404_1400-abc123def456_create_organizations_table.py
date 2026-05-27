"""create_organizations_table

Revision ID: abc123def456
Revises: a546709840eb
Create Date: 2026-04-04 14:00:00.000000

Creates the organizations table for multi-tenancy support.
This is required before creating categories/products which reference organizations.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "abc123def456"
down_revision: str | Sequence[str] | None = "a546709840eb"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create organizations table."""
    op.create_table(
        "organizations",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False, index=True),
        sa.Column("tenant_id", sa.UUID(), unique=True, index=True, nullable=False),
        # Branding
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("banner_url", sa.String(500), nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        # Verification
        sa.Column(
            "status",
            sa.String(50),
            server_default="pending_verification",
            nullable=False,
            index=True,
        ),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "verified_by",
            sa.UUID(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Wallet ref (plain UUID to avoid circular FK)
        sa.Column("wallet_id", sa.UUID(), nullable=True),
        # Onboarding
        sa.Column("setup_complete", sa.Boolean(), default=False, nullable=False),
        # Settings
        sa.Column("settings", sa.JSON(), default=dict, nullable=False),
        # Timestamps
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
            onupdate=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Drop organizations table."""
    op.drop_table("organizations")
