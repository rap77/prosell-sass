"""Reconcile vehicle attribute values to Spanish canonical vocabulary.

Revision ID: 20260918_0001
Revises: 20260917_0001
Create Date: 2026-09-18

Companion to the seed_categories change in d6069110 (which added the
canonical Spanish `options` lists to attribute_schema) and the catalog
change in c13f9e3e (which made NHTSA_TO_FACEBOOK emit Spanish canonical
values). With the new vocabulary in code, this migration brings EXISTING
production data forward:

  1. Updates `categories.attribute_schema` JSONB so the canonical Spanish
     `options` lists are present on every Carros y Camionetas leaf (and
     on the other vehicle leaves — Motos, Camiones, Yates, RVs). The
     seed's `force=True` path is what populated the schema on FRESH DBs;
     this migration does the same on EXISTING DBs without requiring
     `FORCE_SEED=1` (which the project never sets in staging/prod).
  2. Reconciles `products.attributes[*]` per field_key:
       - Snake_case legacy tokens emitted by the old NHTSA_TO_FACEBOOK
         (e.g. ``"ford"``, ``"suv"``, ``"automatic"``) → their Spanish
         canonical values (``"Ford"``, ``"SUV"``, ``"Transmisión
         automática"``). The catalog's ``accepted_raw_aliases`` carries
         both, so reconcile() resolves each pair unambiguously.
       - Products already in Spanish are left untouched (reconcile()
         returns the input as-is when it's the canonical_value).
       - Values reconcile() cannot match (FALLBACK emissions) are
         excluded, NOT zeroed — the operator can correct them via the
         product form.

Downgrade is symmetric: every migrated attribute's pre-migration value
is stashed in an `_pre_spanish_migration_<field_key>` JSONB marker key,
then the field key is restored to its pre-migration raw value. The
schema-options update is not reverted (downgrade reverts data only),
because forcing the seed back through `FORCE_SEED=1` is the project's
documented escape hatch for that.
"""

import json
import logging
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

from prosell.domain.services.facebook_vehicle_value_catalog import (
    FACEBOOK_VEHICLE_VALUE_CATALOG,
    reconcile,
)

revision = "20260918_0001"
down_revision = "20260917_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

# Marker key prefix stashed in `attributes` JSONB so downgrade() can
# restore the exact pre-migration raw value without a separate audit
# table (matches the precedent set by 20260917_0001 and 20260812_0002).
_PRE_MARKER_PREFIX = "_pre_spanish_migration_"

# Vehicle leaf slugs whose attribute_schema and products need updating.
# Each entry maps to its seed-time attribute_schema. The schema is
# regenerated from a small declarative spec below so the migration does
# not depend on seed_categories being importable at migration time
# (alembic env is deliberately decoupled).
VEHICLE_LEAF_SLUGS: tuple[str, ...] = (
    "carros-y-camionetas",
    "scooters-y-urbanas",
    "deportivas",
    "enduro-y-cross",
    "chopper",
    "camiones-de-carga",
    "tractocamiones",
    "autobuses",
    "vans-de-reparto",
    "rvs-motorhomes",
    "remolques",
    "yates",
    "lanchas",
    "veleros",
)


def _spanish_options(field_key: str) -> list[str] | None:
    """Return the Spanish canonical list for `field_key`, or None when the
    field_key has no canonical catalog (e.g. `year`, `mileage`).
    """
    options = FACEBOOK_VEHICLE_VALUE_CATALOG.get(field_key)
    if not options:
        return None
    return [option.canonical_value for option in options]


def _update_category_attribute_schema(connection: sa.engine.Connection) -> int:
    """For every Carros-y-Camionetas leaf (and sibling vehicle leaves)
    in this DB, replace its `attribute_schema` JSONB so each
    filter_type=select field with a Spanish catalog has the canonical
    Spanish `options` list.

    Idempotent: a leaf whose current `attribute_schema.options` for a
    field already equals the canonical list is left untouched. A leaf
    whose `attribute_schema` is empty/NULL (admin-cleared) is also left
    untouched — the next `seed_global_taxonomy(force=True)` from
    init_data.py is the documented repair path for those.
    """
    updated = 0
    for slug in VEHICLE_LEAF_SLUGS:
        row = connection.execute(
            sa.text(
                """
                SELECT id, attribute_schema
                FROM categories
                WHERE slug = :slug AND tenant_id IS NULL
                """
            ),
            {"slug": slug},
        ).fetchone()
        if row is None or row.attribute_schema is None:
            continue
        schema = dict(row.attribute_schema)
        changed = False
        for field_key, entry in schema.items():
            if not isinstance(entry, dict):
                continue
            if entry.get("filter_type") != "select":
                continue
            spanish = _spanish_options(field_key)
            if spanish is None:
                continue
            current = entry.get("options")
            if current == spanish:
                continue
            schema[field_key] = {**entry, "options": spanish}
            changed = True
        if not changed:
            continue
        connection.execute(
            sa.text(
                """
                UPDATE categories
                SET attribute_schema = CAST(:schema AS jsonb),
                    updated_at = CAST(:updated_at AS timestamptz)
                WHERE id = CAST(:id AS uuid)
                """
            ),
            {
                "schema": json.dumps(schema),
                "updated_at": datetime.now(UTC),
                "id": row.id,
            },
        )
        updated += 1
        logger.info(
            "migrate_vehicle_values_to_spanish: updated category slug=%s id=%s",
            slug,
            row.id,
        )
    return updated


def _find_candidates(
    connection: sa.engine.Connection, field_key: str, canonical_values: list[str]
) -> list[tuple[object, str]]:
    """Products with a non-null `field_key` attribute that is NOT already
    one of the canonical Spanish values. Returns (product_id, raw_value).
    """
    rows = connection.execute(
        sa.text(
            """
            SELECT id, attributes->>:field_key AS current_value
            FROM products
            WHERE attributes ? :field_key
              AND attributes->>:field_key IS NOT NULL
              AND NOT (attributes->>:field_key = ANY(CAST(:canonical_values AS text[])))
            """
        ),
        {"field_key": field_key, "canonical_values": canonical_values},
    ).fetchall()
    return [(row.id, row.current_value) for row in rows]


def _product_exists(connection: sa.engine.Connection, product_id: object) -> bool:
    return bool(
        connection.execute(
            sa.text("SELECT EXISTS(SELECT 1 FROM products WHERE id = :id)"),
            {"id": product_id},
        ).scalar_one()
    )


def _current_attribute_value(
    connection: sa.engine.Connection, product_id: object, field_key: str
) -> str | None:
    return connection.execute(
        sa.text("SELECT attributes->>:field_key FROM products WHERE id = :id"),
        {"field_key": field_key, "id": product_id},
    ).scalar_one_or_none()


def _apply_migration(
    connection: sa.engine.Connection,
    product_id: object,
    field_key: str,
    old_value: str,
    new_value: str,
) -> None:
    marker_key = f"{_PRE_MARKER_PREFIX}{field_key}"
    connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = jsonb_set(
                jsonb_set(
                    attributes,
                    CAST(ARRAY[:marker_key] AS text[]),
                    to_jsonb(CAST(:old_value AS text))
                ),
                CAST(ARRAY[:field_key] AS text[]),
                to_jsonb(CAST(:new_value AS text))
            )
            WHERE id = :id
            """
        ),
        {
            "marker_key": marker_key,
            "old_value": old_value,
            "field_key": field_key,
            "new_value": new_value,
            "id": product_id,
        },
    )


def _do_upgrade(connection: sa.engine.Connection) -> None:
    categories_updated = _update_category_attribute_schema(connection)
    logger.info(
        "migrate_vehicle_values_to_spanish: updated %d category schema(s)",
        categories_updated,
    )

    migrated = 0
    excluded = 0
    for field_key, options in FACEBOOK_VEHICLE_VALUE_CATALOG.items():
        canonical_values = [option.canonical_value for option in options]
        candidates = _find_candidates(connection, field_key, canonical_values)

        for product_id, captured_value in candidates:
            if not _product_exists(connection, product_id):
                logger.info(
                    "migrate_vehicle_values_to_spanish: excluded product=%s field=%s "
                    "reason=product_no_longer_exists",
                    product_id,
                    field_key,
                )
                excluded += 1
                continue

            new_value = reconcile(field_key, captured_value)
            if new_value is None:
                logger.info(
                    "migrate_vehicle_values_to_spanish: excluded product=%s field=%s "
                    "reason=no_catalog_match raw_value=%s",
                    product_id,
                    field_key,
                    captured_value,
                )
                excluded += 1
                continue

            current_value = _current_attribute_value(connection, product_id, field_key)
            if current_value != captured_value:
                logger.info(
                    "migrate_vehicle_values_to_spanish: excluded product=%s field=%s "
                    "reason=value_drifted",
                    product_id,
                    field_key,
                )
                excluded += 1
                continue

            _apply_migration(connection, product_id, field_key, captured_value, new_value)
            migrated += 1

    logger.info(
        "migrate_vehicle_values_to_spanish: done — migrated=%d excluded=%d categories_updated=%d",
        migrated,
        excluded,
        categories_updated,
    )


def _do_downgrade(connection: sa.engine.Connection) -> None:
    restored = 0
    for field_key in FACEBOOK_VEHICLE_VALUE_CATALOG:
        marker_key = f"{_PRE_MARKER_PREFIX}{field_key}"
        rows = connection.execute(
            sa.text(
                """
                SELECT id, attributes->>:marker_key AS old_value
                FROM products
                WHERE attributes ? :marker_key
                """
            ),
            {"marker_key": marker_key},
        ).fetchall()
        for row in rows:
            connection.execute(
                sa.text(
                    """
                    UPDATE products
                    SET attributes = (attributes - :marker_key)
                        || jsonb_build_object(
                            CAST(:field_key AS text), CAST(:old_value AS text)
                        )
                    WHERE id = :id
                    """
                ),
                {
                    "marker_key": marker_key,
                    "field_key": field_key,
                    "old_value": row.old_value,
                    "id": row.id,
                },
            )
            restored += 1
    logger.info(
        "migrate_vehicle_values_to_spanish: downgrade restored=%d",
        restored,
    )


def upgrade() -> None:
    _do_upgrade(op.get_bind())


def downgrade() -> None:
    _do_downgrade(op.get_bind())
