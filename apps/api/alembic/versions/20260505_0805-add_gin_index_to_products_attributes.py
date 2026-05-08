"""add_gin_index_to_products_attributes

Revision ID: 20260505_0805
Revises: 20260428_1625
Create Date: 2026-05-05 08:05:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '20260505_0805'
down_revision: str | Sequence[str] | None = '20260428_1625'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema - Add GIN index to products.attributes for efficient JSONB queries."""
    
    # =========================================================================
    # GIN INDEX ON PRODUCTS.ATTRIBUTES
    # =========================================================================
    # Create a GIN index with jsonb_path_ops operator class
    # This optimizes containment queries like: attributes @> '{"key": "value"}'
    # 
    # Benefits:
    # - Faster JSONB containment queries (@> operator)
    # - Supports existence checks (? operator)
    # - Efficient for partial JSONB matching
    # 
    # Note: jsonb_path_ops is smaller and faster for containment queries
    # but doesn't support all JSONB operators. For full operator support,
    # remove postgresql_ops parameter.
    
    op.create_index(
        "ix_products_attributes_gin",
        "products",
        ["attributes"],
        postgresql_using="gin",
        postgresql_ops={"attributes": "jsonb_path_ops"},
    )


def downgrade() -> None:
    """Downgrade schema - Remove GIN index from products.attributes."""
    
    # Drop the GIN index
    op.drop_index(
        "ix_products_attributes_gin",
        table_name="products",
    )
