"""Add attribute_groups column to categories

Revision ID: add_attribute_groups_20260628
Revises: 787a09dad21b
Create Date: 2026-06-28 19:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "add_attribute_groups_20260628"
down_revision: str | Sequence[str] | None = "787a09dad21b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "categories",
        sa.Column(
            "attribute_groups",
            JSONB,
            server_default="[]",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("categories", "attribute_groups")
