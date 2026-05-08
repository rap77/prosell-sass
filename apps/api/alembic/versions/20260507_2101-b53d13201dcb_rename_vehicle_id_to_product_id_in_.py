"""rename vehicle_id to product_id in leads and appointments

Revision ID: b53d13201dcb
Revises: c3schema_cleanup
Create Date: 2026-05-07 21:01:00.000000

"""
from collections.abc import Sequence
from alembic import op

revision: str = 'b53d13201dcb'
down_revision: str | Sequence[str] | None = 'c3schema_cleanup'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("leads", "vehicle_id", new_column_name="product_id")
    op.alter_column("appointments", "vehicle_id", new_column_name="product_id")


def downgrade() -> None:
    op.alter_column("leads", "product_id", new_column_name="vehicle_id")
    op.alter_column("appointments", "product_id", new_column_name="vehicle_id")
