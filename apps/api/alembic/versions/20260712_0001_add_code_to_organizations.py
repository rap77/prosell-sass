"""Add code (abbreviation) field to organizations.

Revision ID: 20260712_0001
Revises: 20260709_0001
Create Date: 2026-07-12
"""

import sqlalchemy as sa
from alembic import op

revision = "20260712_0001"
down_revision = "20260709_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("code", sa.String(5), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "code")
