"""add product_ownership table

Revision ID: add_product_ownership_20260705
Revises: c8a7e1f93b21
Create Date: 2026-07-05 00:00:01.000000

Multi-owner support for any product type. A product can have N owners
with percentage shares (must sum to 100%). Generalizes ownership across
all niches: vehicles, real estate, equipment, etc.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "add_product_ownership_20260705"
down_revision: str | Sequence[str] | None = "add_attribute_groups_20260628"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "product_ownership",
        sa.Column(
            "product_id", UUID(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "owner_id",
            UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=False, server_default="100.00"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("product_id", "owner_id"),
        sa.CheckConstraint(
            "percentage > 0 AND percentage <= 100", name="ck_product_ownership_percentage_range"
        ),
    )
    # ponytail: no index beyond PK — queries filter by product_id (covered by PK)


def downgrade() -> None:
    op.drop_table("product_ownership")
