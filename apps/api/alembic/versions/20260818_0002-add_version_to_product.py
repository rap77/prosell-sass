"""add version to product

Revision ID: 20260818_0002
Revises: 20260818_0003
Create Date: 2026-08-20 00:00:00.000000

Slice 4/10 of the reverse-transitions spec. Adds the optimistic-locking
version column to products (NOT NULL, default 1). NOTE: the revision id
follows the spec's numbering (0002 for version, 0003 for
archived_from_status), but this migration chains AFTER 20260818_0003 in the
Alembic graph because that one landed first (slice 3 before slice 4) —
down_revision reflects actual apply order, not the id's numeric suffix.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260818_0002"
down_revision: str | Sequence[str] | None = "20260818_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add version column to products table (NOT NULL, default 1)."""
    op.add_column(
        "products",
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )


def downgrade() -> None:
    """Remove version column from products table."""
    op.drop_column("products", "version")
