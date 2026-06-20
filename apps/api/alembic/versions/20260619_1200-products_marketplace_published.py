"""products.published_to_marketplace — Subsystem D marketplace visibility

Adds a boolean flag on `products` that ProSell-vendor roles can toggle to
publish a product to the cross-dealer marketplace. Default FALSE so
existing rows opt-in only via explicit publish action.

Subsystem D — Task 1.5. See docs/superpowers/changes/subsystem-d-dealer-ownership/design.md.

Revision ID: products_mkt_published_20260619
Revises: users_bkp_jsonb_20260608
Create Date: 2026-06-19 12:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "products_mkt_published_20260619"
down_revision: str | Sequence[str] | None = "users_bkp_jsonb_20260608"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column(
            "published_to_marketplace",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_products_published_to_marketplace",
        "products",
        ["published_to_marketplace"],
    )


def downgrade() -> None:
    op.drop_index("ix_products_published_to_marketplace", table_name="products")
    op.drop_column("products", "published_to_marketplace")
