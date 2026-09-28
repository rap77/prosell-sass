"""add vehicle_code to product (durable, globally unique catalog identifier)

Revision ID: 20260926_0001
Revises: 20260925_0003
Create Date: 2026-09-26

Why
---
The `Exportar catálogo (formato cliente)` button writes a 1-based
sequential position into the CSV's `id` column. That number is regenerated
on every export, so legacy tools and the future `fb-autopost` integration
cannot reference a product across exports by a stable identifier.

This migration adds a first-class `vehicle_code` column on `products` so
the CSV can carry a durable, stored value (a legacy product id), with
these properties:

  * `BIGINT NULL` — wide enough for ~92 quintillion rows. `INTEGER` would
    clip at ~2.1B and break the platform in ~10 years at current growth.
  * **Globally unique** when set (`UNIQUE INDEX … WHERE vehicle_code IS NOT NULL`),
    not per-tenant: the super_admin manages multiple orgs and treats
    `vehicle_code` as a legacy product id. The partial-index shape lets
    pre-existing rows stay NULL (legacy products without a code).
  * **Backfilled** for every pre-existing row from `ROW_NUMBER() OVER
    (ORDER BY created_at)`, so the partial unique index has nothing to
    reject post-deploy.
  * Editable from the UI on manual product creation (default = allocator
    picks the next MAX + 1), and preservable from the client CSV on
    bulk import (the CSV `id` column maps directly to `vehicle_code`).
  * **Reversible**: `downgrade()` drops the index then the column.

The column does NOT participate in any product-list filter today; the
allocator (`VehicleCodeAllocator`, `apps/api/src/prosell/domain/services`)
is the only place that allocates automatically. It uses the PostgreSQL
sequence created below, so concurrent callers receive distinct codes.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260926_0001"
down_revision: str | None = "20260925_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add vehicle_code column + partial unique index, backfill pre-existing rows."""
    op.add_column(
        "products",
        sa.Column("vehicle_code", sa.BigInteger(), nullable=True),
    )
    # Global uniqueness, partial index: lets NULL rows coexist (legacy
    # products without a code, and the brief window before the backfill
    # below commits). When set, every row must carry a distinct value.
    op.create_index(
        "ix_products_vehicle_code_unique",
        "products",
        ["vehicle_code"],
        unique=True,
        postgresql_where=sa.text("vehicle_code IS NOT NULL"),
    )
    # Backfill: assign a deterministic 1-based code to every pre-existing
    # row, ordered by created_at so the assignment is stable across
    # re-runs. ROW_NUMBER() is a single-pass aggregate — fast even on
    # tables with many rows. The UPDATE then joins back by id so the
    # ordering doesn't depend on the storage's physical row order.
    op.execute(
        sa.text(
            """
            WITH numbered AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
                FROM products
                WHERE vehicle_code IS NULL
            )
            UPDATE products
            SET vehicle_code = numbered.rn
            FROM numbered
            WHERE products.id = numbered.id
            """
        )
    )
    # ``MAX(vehicle_code) + 1`` races under concurrent product creation.
    # A database-native sequence is atomic and starts immediately after the
    # migrated legacy codes. ``is_called`` is false for an empty table so
    # the first nextval() remains 1.
    op.execute(sa.text("CREATE SEQUENCE products_vehicle_code_seq AS BIGINT"))
    op.execute(
        sa.text(
            """
            SELECT setval(
                'products_vehicle_code_seq',
                COALESCE(MAX(vehicle_code), 1),
                COUNT(vehicle_code) > 0
            )
            FROM products
            """
        )
    )


def downgrade() -> None:
    """Drop the sequence, partial unique index, then vehicle_code column."""
    op.execute(sa.text("DROP SEQUENCE products_vehicle_code_seq"))
    op.drop_index("ix_products_vehicle_code_unique", table_name="products")
    op.drop_column("products", "vehicle_code")
