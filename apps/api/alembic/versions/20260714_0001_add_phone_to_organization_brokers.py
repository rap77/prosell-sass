"""Add phone column to organization_brokers table.

Revision ID: 20260714_0001
Revises: 20260712_0002
Create Date: 2026-07-14
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers
revision = "20260714_0001"
down_revision = "20260712_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organization_brokers",
        sa.Column("phone", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organization_brokers", "phone")
