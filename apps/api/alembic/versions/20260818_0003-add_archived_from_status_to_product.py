"""add archived_from_status to product

Revision ID: 20260818_0003
Revises: 20260818_0001
Create Date: 2026-08-20 00:00:00.000000

Slice 3/10 of the reverse-transitions spec. Nullable column that records
the status a product held right before it was archived, so restore() knows
where to return it. Existing archived rows get NULL — restoring them
requires manual admin fixup (see spec: error code
archived_before_reverse_transitions_feature).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260818_0003"
down_revision: str | Sequence[str] | None = "20260818_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add archived_from_status column to products table (nullable, no default)."""
    op.add_column(
        "products",
        sa.Column("archived_from_status", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    """Remove archived_from_status column from products table."""
    op.drop_column("products", "archived_from_status")
