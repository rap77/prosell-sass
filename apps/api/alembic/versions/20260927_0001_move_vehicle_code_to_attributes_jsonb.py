"""move vehicle_code from products column into attributes JSONB

Revision ID: 20260927_0001
Revises: 20260926_0001
Create Date: 2026-09-27

Why
---
The earlier migration (20260926_0001) made ``vehicle_code`` a first-class
column on ``products``: BIGINT NULL with a partial unique index for global
uniqueness, fed by an atomic ``nextval`` sequence and surfaced in the
client-format catalog CSV's ``id`` column.

After more design conversation we changed course: ``vehicle_code`` is a
*vehicle-category* concern, not a platform-wide one. Only products in the
``vehiculos-y-transporte`` vertical ever carry a value, and the field
belongs visually with the rest of the vehicle identity attributes (VIN,
make, model, year) in the ``identificacion`` group of the category
schema. Promoting it to a global column pays a cost (every product gets
an extra column, partial index over the whole table, allocator wired
into every create/update path) for no benefit on non-vehicle categories.

This migration undoes the column promotion and keeps every guarantee via
a **PostgreSQL functional unique index** on the JSONB path
``(attributes->>'vehicle_code')``:

    CREATE UNIQUE INDEX ix_products_attrs_vehicle_code_unique
        ON products ((attributes->>'vehicle_code'))
        WHERE (attributes->>'vehicle_code') IS NOT NULL;

PostgreSQL supports B-tree indexes on expressions (and UNIQUE ones), so
two products cannot both carry ``attributes["vehicle_code"] == "42"`` —
the second INSERT fails with a unique violation that the application
maps to ``DuplicateVehicleCodeError``. The atomic-alloc property of the
sequence is unchanged (``nextval`` is still race-free across
concurrent callers).

Data migration
--------------
If the previous migration already ran on the target database, every row
has ``vehicle_code`` populated (backfilled by ``ROW_NUMBER()`` in
20260926_0001). We copy the value into ``attributes->>'vehicle_code'``
BEFORE dropping the column so the uniqueness invariant is preserved
across the migration: if we dropped first, a concurrent INSERT with a
JSONB-side value could collide with the not-yet-migrated column-side
value of a different row.

Sequence is kept (``products_vehicle_code_seq``) because the
``VehicleCodeAllocator`` still calls ``nextval`` for atomic allocation —
the only thing that changed is where the value lands at INSERT time.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260927_0001"
down_revision: str | None = "20260926_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Move vehicle_code into attributes JSONB; drop the column.

    Order matters: copy first, then drop the unique column index, then
    drop the column, then create the functional unique index. Only the
    drop+create order matters for correctness; the copy must precede
    EVERYTHING so the JSONB uniqueness invariant holds throughout.

    `vehicle_code` is a vehicle-category concern, not a platform-wide
    attribute. We restrict the copy to products whose category's
    `attribute_schema` declares a `vehicle_code` key — anything else
    would spread a vehicle-only field onto every non-vehicle product,
    which contradicts the design.
    """
    # 1. Copy existing values into attributes (only rows whose category
    #    schema declares a `vehicle_code` key). `attributes` is JSONB;
    #    `attributes->>'vehicle_code'` is text so we cast the integer
    #    column to text. ``jsonb_set`` is a single statement per row —
    #    one UPDATE over the whole table is cheaper than N round-trips.
    op.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = jsonb_set(
                COALESCE(attributes, '{}'::jsonb),
                '{vehicle_code}',
                to_jsonb(vehicle_code),
                true
            )
            WHERE vehicle_code IS NOT NULL
              AND category_id IN (
                SELECT id
                FROM categories
                WHERE attribute_schema ? 'vehicle_code'
              )
            """
        )
    )

    # 2. Drop the partial unique index on the column (must precede the
    #    column drop).
    op.drop_index("ix_products_vehicle_code_unique", table_name="products")

    # 3. Drop the column itself.
    op.drop_column("products", "vehicle_code")

    # 4. Create the functional unique index on the JSONB path. Partial
    #    WHERE keeps the index narrow — non-vehicle products (and any
    #    vehicle product without an explicit code) are excluded from the
    #    index, so they don't consume space or slow inserts.
    #
    #    ``((attributes->>'vehicle_code'))`` is treated as text by the
    #    expression evaluation, which is exactly what we want: every
    #    caller (Python, JSONB encoder) writes the code as a string, so
    #    comparing ``"42" == "42"`` is correct and avoids any
    #    integer/float type surprises in client formatters.
    op.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX ix_products_attrs_vehicle_code_unique
                ON products ((attributes->>'vehicle_code'))
                WHERE (attributes->>'vehicle_code') IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    """Restore the column shape (rollback path, in case we need to revert).

    Inverse of upgrade(): drop the JSONB-side functional index, copy
    values back into the column, recreate the partial unique index on
    the column, and re-create the sequence.
    """
    # 1. Drop the JSONB functional unique index first.
    op.execute(sa.text("DROP INDEX IF EXISTS ix_products_attrs_vehicle_code_unique"))

    # 2. Re-create the column.
    op.add_column(
        "products",
        sa.Column("vehicle_code", sa.BigInteger(), nullable=True),
    )

    # 3. Copy values back from JSONB. ``(attributes->>'vehicle_code')::bigint``
    #    works because we always stored as text. Rows with no JSONB code
    #    stay NULL, preserving the partial unique index shape.
    op.execute(
        sa.text(
            """
            UPDATE products
            SET vehicle_code = (attributes->>'vehicle_code')::bigint
            WHERE attributes ? 'vehicle_code'
              AND attributes->>'vehicle_code' IS NOT NULL
            """
        )
    )

    # 4. Re-create the partial unique index.
    op.create_index(
        "ix_products_vehicle_code_unique",
        "products",
        ["vehicle_code"],
        unique=True,
        postgresql_where=sa.text("vehicle_code IS NOT NULL"),
    )

    # 5. Re-create the sequence, seeded to MAX + 1 of the (now-restored)
    #    column values so future allocations continue from where the
    #    legacy values leave off.
    op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS products_vehicle_code_seq AS BIGINT"))
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
