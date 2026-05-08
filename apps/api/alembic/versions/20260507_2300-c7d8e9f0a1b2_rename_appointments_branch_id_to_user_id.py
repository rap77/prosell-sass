"""rename appointments.branch_id to user_id

Revision ID: c7d8e9f0a1b2
Revises: a1b2c3d4e5f6
Create Date: 2026-05-07 23:00:00.000000

"""
from collections.abc import Sequence
from alembic import op

revision: str = 'c7d8e9f0a1b2'
down_revision: str | Sequence[str] | None = 'a1b2c3d4e5f6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Rename dealer_id → user_id (the column was originally named dealer_id)
    op.alter_column("appointments", "dealer_id", new_column_name="user_id")


def downgrade() -> None:
    op.alter_column("appointments", "user_id", new_column_name="dealer_id")
