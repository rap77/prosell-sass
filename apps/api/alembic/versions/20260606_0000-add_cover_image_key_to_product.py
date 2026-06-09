"""add cover_image_key to product

Revision ID: add_cover_image_key
Revises: xyzabc123456
Create Date: 2026-06-06

Why
---
The catalog and detail view used to render the cover image by always
taking the first entry of `product.image_urls`. That implicit "first =
cover" convention was wrong: the seller has no UI to control which image
becomes the cover, and the order in `image_urls` is just upload order.

This migration adds a first-class `cover_image_key` column so the cover
is explicit, queryable, and settable independently from the upload
order. `image_urls` keeps the ordered list for gallery display;
`cover_image_key` is the single source of truth for "which image is the
cover". Nullable: a product with no images has no cover.

The old `is_primary` flag on `product_images` is left untouched and is
considered legacy — it is not read by the application code today and
its semantics overlap with this column.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "add_cover_image_key"
down_revision: str | None = "xyzabc123456"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add cover_image_key column to products table (nullable, no default)."""
    op.add_column(
        "products",
        sa.Column("cover_image_key", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    """Remove cover_image_key column from products table."""
    op.drop_column("products", "cover_image_key")
