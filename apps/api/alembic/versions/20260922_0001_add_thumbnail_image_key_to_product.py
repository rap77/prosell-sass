"""add thumbnail_image_key to product

Revision ID: 20260922_0001
Revises: 20260920_0001
Create Date: 2026-09-22

Why
---
The catalog grid previously fetched a signed cover URL per visible
product via GET /products/{id}/image-urls. That fan-out produced one
HTTP round-trip per card and signed the entire gallery even though
the card only consumes one image.

This migration adds a first-class `thumbnail_image_key` column so the
image-router pipeline can persist the private 600x600 derivative
generated for the catalog-card surface. `cover_image_key` keeps its
existing meaning (the gallery-cover selection) and the two are
independent: the thumbnail is a private signed URL for the small
derivative, the cover is the gallery-display selection.

Nullable: a product without a generated thumbnail falls back to the
first gallery entry at read time, so this column is non-breaking for
the legacy catalog. Idempotent and reversible.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260922_0001"
down_revision: str | None = "20260920_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add thumbnail_image_key column to products table (nullable, no default)."""
    op.add_column(
        "products",
        sa.Column("thumbnail_image_key", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    """Remove thumbnail_image_key column from products table."""
    op.drop_column("products", "thumbnail_image_key")
