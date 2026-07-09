"""Add organization contact and address fields.

Revision ID: 20260709_0001
Revises: 20260707_0001
Create Date: 2026-07-09
"""

import sqlalchemy as sa
from alembic import op

revision = "20260709_0001"
down_revision = "refactor_brokers_20260707"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("organizations", sa.Column("whatsapp", sa.String(50), nullable=True))
    op.add_column("organizations", sa.Column("street_address", sa.String(500), nullable=True))
    op.add_column("organizations", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("organizations", sa.Column("state", sa.String(100), nullable=True))
    op.add_column("organizations", sa.Column("postal_code", sa.String(20), nullable=True))
    op.add_column("organizations", sa.Column("country", sa.String(100), nullable=True))
    op.add_column("organizations", sa.Column("tax_id", sa.String(50), nullable=True))
    op.add_column("organizations", sa.Column("instagram", sa.String(100), nullable=True))
    op.add_column("organizations", sa.Column("facebook", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "facebook")
    op.drop_column("organizations", "instagram")
    op.drop_column("organizations", "tax_id")
    op.drop_column("organizations", "country")
    op.drop_column("organizations", "postal_code")
    op.drop_column("organizations", "state")
    op.drop_column("organizations", "city")
    op.drop_column("organizations", "street_address")
    op.drop_column("organizations", "whatsapp")
    op.drop_column("organizations", "email")
