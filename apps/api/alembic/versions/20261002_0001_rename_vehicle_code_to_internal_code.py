"""rename vehicle_code to internal_code (attributes key, category schema, trigger, index, sequence)

Revision ID: 20261002_0001
Revises: 20260929_0001
Create Date: 2026-10-02

Why
---
`vehicle_code` was sourced from the client CSV's `id` column on bulk
import — the client's own legacy identifier doubled as the platform's
durable product code. That coupling is gone: every code is now
allocated purely internally (`VehicleCodeAllocator`, nextval-backed),
never read from an external source. The name `vehicle_code` stops
describing that correctly, so this migration renames the concept end
to end to `internal_code` — the JSONB key on both `products.attributes`
and `categories.attribute_schema`/`attribute_groups`, the functional
unique index, the enforcement trigger/function, and (cosmetic, for
consistency) the backing sequence. No values change, no rows are
added or removed — every existing `vehicle_code` value is preserved
verbatim under the new key.

Ordering
--------
The trigger enforces `attributes->>'vehicle_code' IS NOT NULL` on every
INSERT/UPDATE to a vehicle-category product. If we renamed the JSONB
key while that trigger was still live, every subsequent write would
fail (the trigger would see NULL under the now-stale key name it still
checks). So the OLD trigger/function/index are dropped FIRST, then the
JSONB keys are renamed (products, then categories' schema, then
categories' attribute_groups field list), then the NEW index/trigger
are created under the new names. The whole migration runs inside one
transaction (Alembic's default for PostgreSQL), so no concurrent writer
ever observes a half-renamed state — either the full rename is visible,
or none of it is.

Downgrade
---------
Exact mirror, in reverse: drop the new trigger/function/index, rename
every JSONB key back to `vehicle_code`, recreate the old index/trigger,
rename the sequence back. The data-rename UPDATEs are individually safe
to re-run (each guarded by `WHERE <key> ? '<old_name>'` — a row already
migrated, or never migrated, is a no-op); the DDL steps are NOT —
`CREATE UNIQUE INDEX` and `CREATE TRIGGER` both fail if the target
already exists, same characteristic as the sibling
`20260929_0001_enforce_vehicle_code_required` migration's own trigger
creation. Running `_do_upgrade` twice in the same session without an
intervening `_do_downgrade` (or a manual drop) will fail on the second
`CREATE UNIQUE INDEX` / `CREATE TRIGGER` — exactly like that sibling.

Testing
-------
`_do_upgrade(connection)`/`_do_downgrade(connection)` are sync entry
points, separate from the `upgrade()`/`downgrade()` Alembic wrappers —
same pattern as `20260929_0001_enforce_vehicle_code_required.py`, which
lets the integration test suite drive them directly via
`conn.run_sync(fn)` without going through Alembic's own migration
context.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20261002_0001"
down_revision: str | Sequence[str] | None = "20260929_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _do_upgrade(connection: sa.engine.Connection) -> None:
    # 1. Drop the OLD trigger + function first — see module docstring.
    connection.execute(
        sa.text("DROP TRIGGER IF EXISTS prosell_enforce_vehicle_code_trigger ON products")
    )
    connection.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_vehicle_code()"))

    # 2. Drop the OLD functional unique index (must precede renaming the
    #    JSONB key it indexes).
    connection.execute(sa.text("DROP INDEX IF EXISTS ix_products_attrs_vehicle_code_unique"))

    # 3. Rename the JSONB key in `products.attributes`. `- 'vehicle_code'`
    #    removes the old key, `||` merges in the same value under the new
    #    one — single statement per row, value untouched.
    connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (attributes - 'vehicle_code')
                || jsonb_build_object('internal_code', attributes->'vehicle_code')
            WHERE attributes ? 'vehicle_code'
            """
        )
    )

    # 4. Rename the JSONB key in `categories.attribute_schema` — same
    #    field definition dict, new key.
    connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = (attribute_schema - 'vehicle_code')
                || jsonb_build_object('internal_code', attribute_schema->'vehicle_code')
            WHERE attribute_schema ? 'vehicle_code'
            """
        )
    )

    # 5. Rename the field reference inside every `attribute_groups` entry's
    #    `fields` array (the "identification" group lists field KEYS as
    #    plain strings, not nested objects — a value swap, not a key
    #    rename).
    connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_groups = (
                SELECT jsonb_agg(
                    CASE
                        WHEN group_entry->'fields' ? 'vehicle_code'
                        THEN jsonb_set(
                            group_entry,
                            '{fields}',
                            to_jsonb(ARRAY(
                                SELECT CASE
                                    WHEN value = 'vehicle_code' THEN 'internal_code'
                                    ELSE value
                                END
                                FROM jsonb_array_elements_text(group_entry->'fields') AS f(value)
                            ))
                        )
                        ELSE group_entry
                    END
                )
                FROM jsonb_array_elements(attribute_groups) AS group_entry
            )
            WHERE EXISTS (
                SELECT 1 FROM jsonb_array_elements(attribute_groups) AS g
                WHERE g->'fields' ? 'vehicle_code'
            )
            """
        )
    )

    # 6. Recreate the functional unique index under the new key.
    connection.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX ix_products_attrs_internal_code_unique
                ON products ((attributes->>'internal_code'))
                WHERE (attributes->>'internal_code') IS NOT NULL
            """
        )
    )

    # 7. Recreate the trigger function + trigger under the new name,
    #    checking the new key. Same recursive category-chain walk-up as
    #    before, just renamed.
    connection.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION prosell_enforce_internal_code()
            RETURNS TRIGGER AS $$
            DECLARE
              declares_internal_code BOOLEAN;
            BEGIN
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
                WHERE attribute_schema ? 'internal_code'
              ) INTO declares_internal_code;

              IF declares_internal_code THEN
                IF NEW.attributes->>'internal_code' IS NULL
                   OR NEW.attributes->>'internal_code' = '' THEN
                  RAISE EXCEPTION
                    'internal_code is required for products in vehicle categories (category_id=%)',
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
    connection.execute(
        sa.text(
            """
            CREATE TRIGGER prosell_enforce_internal_code_trigger
            BEFORE INSERT OR UPDATE ON products
            FOR EACH ROW
            EXECUTE FUNCTION prosell_enforce_internal_code();
            """
        )
    )

    # 8. Rename the sequence — cosmetic (metadata-only, no data movement),
    #    keeps every DB object name consistent with the new field name.
    #    `VehicleCodeAllocator`/the application code are updated in the
    #    same deploy to call `nextval('products_internal_code_seq')`.
    connection.execute(
        sa.text(
            "ALTER SEQUENCE IF EXISTS products_vehicle_code_seq "
            "RENAME TO products_internal_code_seq"
        )
    )


def _do_downgrade(connection: sa.engine.Connection) -> None:
    # Exact mirror of _do_upgrade(), in reverse — see module docstring.
    connection.execute(
        sa.text(
            "ALTER SEQUENCE IF EXISTS products_internal_code_seq "
            "RENAME TO products_vehicle_code_seq"
        )
    )

    connection.execute(
        sa.text("DROP TRIGGER IF EXISTS prosell_enforce_internal_code_trigger ON products")
    )
    connection.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_internal_code()"))
    connection.execute(sa.text("DROP INDEX IF EXISTS ix_products_attrs_internal_code_unique"))

    connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_groups = (
                SELECT jsonb_agg(
                    CASE
                        WHEN group_entry->'fields' ? 'internal_code'
                        THEN jsonb_set(
                            group_entry,
                            '{fields}',
                            to_jsonb(ARRAY(
                                SELECT CASE
                                    WHEN value = 'internal_code' THEN 'vehicle_code'
                                    ELSE value
                                END
                                FROM jsonb_array_elements_text(group_entry->'fields') AS f(value)
                            ))
                        )
                        ELSE group_entry
                    END
                )
                FROM jsonb_array_elements(attribute_groups) AS group_entry
            )
            WHERE EXISTS (
                SELECT 1 FROM jsonb_array_elements(attribute_groups) AS g
                WHERE g->'fields' ? 'internal_code'
            )
            """
        )
    )

    connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = (attribute_schema - 'internal_code')
                || jsonb_build_object('vehicle_code', attribute_schema->'internal_code')
            WHERE attribute_schema ? 'internal_code'
            """
        )
    )

    connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (attributes - 'internal_code')
                || jsonb_build_object('vehicle_code', attributes->'internal_code')
            WHERE attributes ? 'internal_code'
            """
        )
    )

    connection.execute(
        sa.text(
            """
            CREATE UNIQUE INDEX ix_products_attrs_vehicle_code_unique
                ON products ((attributes->>'vehicle_code'))
                WHERE (attributes->>'vehicle_code') IS NOT NULL
            """
        )
    )

    connection.execute(
        sa.text(
            """
            CREATE OR REPLACE FUNCTION prosell_enforce_vehicle_code()
            RETURNS TRIGGER AS $$
            DECLARE
              declares_vehicle_code BOOLEAN;
            BEGIN
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


def upgrade() -> None:
    _do_upgrade(op.get_bind())


def downgrade() -> None:
    _do_downgrade(op.get_bind())
