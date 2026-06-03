"""add image_urls to product

Revision ID: xyzabc123456
Revises: e1f2a3b4c5d6
Create Date: 2026-06-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "xyzabc123456"
down_revision: Union[str, None] = "recreate_facebook_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add image_urls column to products table (JSONB, nullable with default=[])."""
    op.add_column(
        "products",
        sa.Column("image_urls", JSONB(), nullable=True, server_default="[]"),
    )


def downgrade() -> None:
    """Remove image_urls column from products table."""
    op.drop_column("products", "image_urls")