"""Reconcile legacy vehicle attribute values against the canonical catalog.

Revision ID: 20260917_0001
Revises: 20260822_0001
Create Date: 2026-09-17

u1-vehicle-catalog-api, FR3.1/BR3.1 — before FacebookVehicleValueCatalog
existed, vehicle products could be saved with attribute values that don't
match ANY value Facebook Marketplace's canonical catalog now accepts for
their field_key (finding #87, code-quality-assessment.md). This guarded
data migration reconciles those legacy values in-place where a match
exists, and excludes (without aborting) any record that fails one of its
guards.

3 guards per candidate record, applied in this order (BR3.1):
  1. The product still exists.
  2. The legacy value reconciles to a canonical value (FacebookVehicleValueCatalog).
  3. The value has not drifted since the candidate batch was built (the
     current value still equals what was captured — protects against
     another process mutating the record mid-migration).

These guards are OWN to this migration, not a literal copy of
`20260812_0002_migrate_legacy_sedan_products.py` (that precedent validates
a different shape: a destination category still existing and reviewed
products still matching an expected category/attribute, because it moves
`category_id` — it never validates a "new value" because it doesn't change
attribute values at all). The spirit borrowed from that precedent is
"validate before mutating, and guard against state drift between building
the candidate batch and applying it" — not its literal guard functions.

`downgrade()` is symmetric: each migrated record's pre-migration raw value
is stashed alongside it (under an `attributes` JSONB marker key, no new
table — NFR-SEC-4: no dedicated audit table for non-sensitive vehicle
attributes) so it can be restored exactly, then the marker is removed.
"""

import logging

import sqlalchemy as sa
from alembic import op

from prosell.domain.services.facebook_vehicle_value_catalog import (
    FACEBOOK_VEHICLE_VALUE_CATALOG,
    reconcile,
)

revision = "20260917_0001"
down_revision = "20260822_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

# Prefix for the marker key stashed inside `attributes` JSONB during
# upgrade() so downgrade() can restore the exact pre-migration value
# without a separate audit table.
_MARKER_PREFIX = "_pre_migration_"


def _find_candidates(
    connection: sa.engine.Connection, field_key: str, canonical_values: list[str]
) -> list[tuple[object, str]]:
    """Products with a non-null `field_key` attribute that is NOT already
    one of the field's canonical values (BR3.1 candidate set)."""
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
    marker_key = f"{_MARKER_PREFIX}{field_key}"
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
    migrated = 0
    excluded = 0

    for field_key, options in FACEBOOK_VEHICLE_VALUE_CATALOG.items():
        canonical_values = [option.canonical_value for option in options]
        candidates = _find_candidates(connection, field_key, canonical_values)

        for product_id, captured_value in candidates:
            # Guard 1 — the product still exists.
            if not _product_exists(connection, product_id):
                # NFR-SEC-4 — the summary log records counts and product IDs
                # only, never the attribute value in plain text.
                logger.info(
                    "migrate_legacy_vehicle_catalog: excluded product=%s field=%s "
                    "reason=product_no_longer_exists",
                    product_id,
                    field_key,
                )
                excluded += 1
                continue

            # Guard 2 — the legacy value reconciles to a canonical value.
            new_value = reconcile(field_key, captured_value)
            if new_value is None:
                logger.info(
                    "migrate_legacy_vehicle_catalog: excluded product=%s field=%s "
                    "reason=no_catalog_match",
                    product_id,
                    field_key,
                )
                excluded += 1
                continue

            # Guard 3 — anti-drift: re-read the value right before applying.
            current_value = _current_attribute_value(connection, product_id, field_key)
            if current_value != captured_value:
                logger.info(
                    "migrate_legacy_vehicle_catalog: excluded product=%s field=%s "
                    "reason=value_drifted",
                    product_id,
                    field_key,
                )
                excluded += 1
                continue

            _apply_migration(connection, product_id, field_key, captured_value, new_value)
            logger.info(
                "migrate_legacy_vehicle_catalog: migrated product=%s field=%s",
                product_id,
                field_key,
            )
            migrated += 1

    logger.info(
        "migrate_legacy_vehicle_catalog: done — migrated=%d excluded=%d",
        migrated,
        excluded,
    )


def _do_downgrade(connection: sa.engine.Connection) -> None:
    restored = 0

    for field_key in FACEBOOK_VEHICLE_VALUE_CATALOG:
        marker_key = f"{_MARKER_PREFIX}{field_key}"
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

    logger.info("migrate_legacy_vehicle_catalog: downgrade restored=%d", restored)


def upgrade() -> None:
    _do_upgrade(op.get_bind())


def downgrade() -> None:
    _do_downgrade(op.get_bind())
