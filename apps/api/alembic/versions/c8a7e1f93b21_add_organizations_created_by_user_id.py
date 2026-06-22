"""add organizations.created_by_user_id

Revision ID: c8a7e1f93b21
Revises: b4252cdd1c48
Create Date: 2026-06-22 00:00:01.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c8a7e1f93b21"
down_revision: str | Sequence[str] | None = "b4252cdd1c48"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("created_by_user_id", sa.UUID(), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "created_by_user_id")
