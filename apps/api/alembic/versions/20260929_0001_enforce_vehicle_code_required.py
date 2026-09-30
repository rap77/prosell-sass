"""enforce vehicle_code required for vehicle categories via DB trigger

Revision ID: 20260929_0001
Revises: a5fb511de9e5
Create Date: 2026-09-29

Why
---
The vehicle catalog needs a DB-level guarantee that every product whose
category's ``attribute_schema`` declares ``vehicle_code`` carries a
non-empty ``attributes->>'vehicle_code'`` value. Without this invariant,
the catalog CSV export (u1-cross-org-export-api, BR1.5) can silently
emit empty ``id`` cells, and downstream consumers (the external
client CSV) reject the file. The application-level validator in
``Category.validate_attributes()`` covers most writes but cannot enforce
against manual SQL, direct database migrations, or future code paths
that bypass the validator. A BEFORE INSERT/UPDATE trigger is the only
authoritative enforcement mechanism.

This migration installs that trigger. It also backfills the field on
every existing row that lacks one — without the backfill, the trigger
would reject every legacy row the instant it is installed.

Backfill order
--------------
The backfill MUST run BEFORE the trigger is installed. If we created the
trigger first, every UPDATE the backfill performs on a row that lacks
``vehicle_code`` would fire the trigger and raise — the backfill would
abort mid-way and leave some rows valid and others still NULL. Running
the backfill first means every row is already valid before the trigger
is installed; the trigger then guards future writes only.

The backfill uses ``nextval('products_vehicle_code_seq')`` to allocate
fresh codes — the same sequence the application allocator uses, so the
sequence's ``MAX(vehicle_code)+1`` invariant holds and we never collide
with codes assigned by the normal write path. Sequence consumption is
irreversible, but re-running the migration is safe: the WHERE clause
filters rows that already carry a code, so the second backfill is a
no-op.

Hierarchy walk-up
-----------------
Both the backfill and the trigger walk up the ``categories.parent_id``
chain from the product's ``category_id``. The walk is recursive
(``WITH RECURSIVE``) because the production data is more than two
levels deep — ``seed_categories.py`` nests vehicle categories 3+ levels
under the ``vehiculos-y-transporte`` root (root → terrestrial/aquatic/
aereo → make group → leaf). The seed migration
``20260928_0638-a5fb511de9e5`` adds ``vehicle_code`` to every category
whose ``attribute_schema`` declares ``vin``, so the recursive walk-up
finds the key at the immediate category in the typical case but stays
correct if a future schema-declaration lands only on an ancestor. The
walk-up predicate — ``attribute_schema ? 'vehicle_code'`` — matches the
exact JSONB operator the seed migration uses for the parallel ``vin``
check (seed migration lines 60-83).

Downgrade
---------
``downgrade()`` drops the trigger and the function. The data
backfill is NOT reverted: the sequence values consumed during the
backfill are not returned, and the allocated ``vehicle_code`` values
stay on the rows. Re-running ``upgrade()`` after a downgrade is safe
because the backfill's WHERE clause skips rows that already carry a
code.

Failure mode for partial migration
----------------------------------
If any vehicle-category product has
``attributes->>'vehicle_code' IS NULL OR = ''`` at the moment the
trigger is installed, the next INSERT/UPDATE on that row would fail.
The DDL statement that creates the trigger does NOT fire the trigger
(``CREATE TRIGGER`` is DDL, not DML), so the migration itself never
fails — the failure is delayed to the first concurrent write against
an unfilled row. The deploy runbook should pre-flight::

    SELECT COUNT(*) FROM products p
    WHERE (p.attributes->>'vehicle_code' IS NULL
           OR p.attributes->>'vehicle_code' = '')
      AND EXISTS (
        WITH RECURSIVE cat_walk AS (
          SELECT id, parent_id, attribute_schema FROM categories WHERE id = p.category_id
          UNION ALL
          SELECT c.id, c.parent_id, c.attribute_schema
          FROM categories c JOIN cat_walk cw ON c.id = cw.parent_id
        )
        SELECT 1 FROM cat_walk WHERE attribute_schema ? 'vehicle_code'
      );

If this returns > 0, the backfill step (above) is responsible for
driving it to 0 — verify the migration ran cleanly before assuming the
trigger is safe to leave in place.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260929_0001"
down_revision: str | Sequence[str] | None = "a5fb511de9e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _do_upgrade(connection: sa.engine.Connection) -> None:
    """Backfill existing rows, then install the trigger.

    Order matters — see module docstring. Backfill first so the trigger
    never sees a NULL row mid-migration.
    """
    # 0. Defensive sequence creation. In production, ``products_vehicle_code_seq``
    #    is created by migration ``20260926_0001`` long before this one runs,
    #    so this is a no-op. The integration test suite bootstraps the schema
    #    via ``Base.metadata.create_all`` rather than running the migration
    #    chain, so the sequence does not exist there until something creates
    #    it. ``IF NOT EXISTS`` keeps this migration safe to run on either
    #    bootstrap path.
    connection.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS products_vehicle_code_seq AS BIGINT"))

    # 1. Backfill: walk up the category chain from each product's
    #    category and check if any ancestor (including the immediate
    #    category) declares ``vehicle_code`` in its ``attribute_schema``.
    #    If yes, the product is in a vehicle category and gets a fresh
    #    sequence-allocated value.
    #
    #    The recursion shape mirrors the seed migration
    #    ``20260928_0638-a5fb511de9e5`` (lines 60-83): same
    #    ``attribute_schema ? '...'`` predicate, same walk-up from the
    #    product's category. Seed migration added ``vehicle_code`` to
    #    every category whose schema declares ``vin``; we filter on
    #    the same key it added, so the typical case finds the key at
    #    the immediate category and the recursion terminates at the
    #    root.
    connection.execute(
        sa.text(
            """
            UPDATE products p
            SET attributes = jsonb_set(
                COALESCE(p.attributes, '{}'::jsonb),
                '{vehicle_code}',
                to_jsonb(nextval('products_vehicle_code_seq')::TEXT),
                true
            )
            WHERE (p.attributes->>'vehicle_code' IS NULL
                   OR p.attributes->>'vehicle_code' = '')
              AND EXISTS (
                WITH RECURSIVE cat_walk AS (
                  SELECT id, parent_id, attribute_schema
                  FROM categories
                  WHERE id = p.category_id
                  UNION ALL
                  SELECT c.id, c.parent_id, c.attribute_schema
                  FROM categories c
                  JOIN cat_walk cw ON c.id = cw.parent_id
                )
                SELECT 1 FROM cat_walk
                WHERE attribute_schema ? 'vehicle_code'
              )
            """
        )
    )

    # 2. Trigger function: PL/pgSQL walks up the category chain from
    #    NEW.category_id (matching the backfill's walk-up) and enforces
    #    the invariant only when the chain includes a category that
    #    declares ``vehicle_code``.
    connection.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION prosell_enforce_vehicle_code()
            RETURNS TRIGGER AS $$
            DECLARE
              declares_vehicle_code BOOLEAN;
            BEGIN
              -- Walk up the category chain from NEW.category_id. If ANY
              -- category in the chain (typically the immediate category,
              -- since the seed migration added vehicle_code to every
              -- vehicle category's attribute_schema directly) declares
              -- vehicle_code, this product belongs to a vehicle category
              -- that requires the field. Same recursion shape as the
              -- backfill, parameterised by NEW.category_id.
              WITH RECURSIVE cat_walk AS (
                SELECT id, parent_id, attribute_schema
                FROM categories
                WHERE id = NEW.category_id
                UNION ALL
                SELECT c.id, c.parent_id, c.attribute_schema
                FROM categories c
                JOIN cat_walk cw ON c.id = cw.parent_id
              )
              SELECT EXISTS (
                SELECT 1 FROM cat_walk
                WHERE attribute_schema ? 'vehicle_code'
              ) INTO declares_vehicle_code;

              IF declares_vehicle_code THEN
                IF NEW.attributes->>'vehicle_code' IS NULL
                   OR NEW.attributes->>'vehicle_code' = '' THEN
                  RAISE EXCEPTION
                    'vehicle_code is required for products in vehicle categories (category_id=%)',
                    NEW.category_id
                    USING ERRCODE = 'check_violation';
                END IF;
              END IF;

              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )
    )

    # 3. Bind the trigger to the products table.
    connection.execute(
        sa.text(
            """
            CREATE TRIGGER prosell_enforce_vehicle_code_trigger
            BEFORE INSERT OR UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION prosell_enforce_vehicle_code();
            """
        )
    )


def _do_downgrade(connection: sa.engine.Connection) -> None:
    """Drop the trigger and the function.

    The data backfill is NOT reverted (see module docstring).
    """
    connection.execute(
        sa.text("DROP TRIGGER IF EXISTS prosell_enforce_vehicle_code_trigger ON products")
    )
    connection.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_vehicle_code()"))


def upgrade() -> None:
    _do_upgrade(op.get_bind())


def downgrade() -> None:
    _do_downgrade(op.get_bind())
