"""Add color column to organizations table.

Revision ID: 20260712_0002
Revises: 20260712_0001_add_code_to_organizations
Create Date: 2026-07-12
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "20260712_0002"
down_revision = "20260712_0001_add_code_to_organizations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("color", sa.String(7), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "color")
