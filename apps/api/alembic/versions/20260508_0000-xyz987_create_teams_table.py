"""create_teams_table

Revision ID: xyz987
Revises: c7d8e9f0a1b2
Create Date: 2026-05-08 00:00:00.000000

Creates teams table for multi-tenant organization support.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "xyz987"
down_revision: str | Sequence[str] | None = "c7d8e9f0a1b2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create teams table."""
    op.create_table(
        "teams",
        sa.Column("id", sa.UUID(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "organization_id",
            sa.UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean(), default=True, nullable=False, index=True),
        sa.Column("tenant_id", sa.UUID(), nullable=False, index=True),
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
        sa.UniqueConstraint("organization_id", "slug", name="uq_teams_org_slug"),
    )


def downgrade() -> None:
    """Drop teams table."""
    op.drop_table("teams")
