"""Reconcile vehicle_condition attribute — retire the mislabeled
title_state key, add the field to the "Carros y Camionetas" schema.

Revision ID: 20260925_0002
Revises: 20260925_0001
Create Date: 2026-09-25

Root cause (reported live by the user, verified against the real client
CSV `docs/data39.csv`): the CSV's `state` column never carries a legal
title state (there is no such concept elsewhere in the client's data —
the geographic state already comes from `location`) — every real value
observed is a Facebook condition grade ("Muy bueno", etc., matching
`FB_VEHICLE_CONDITIONS`' Spanish labels). Despite that,
`CSVFieldMapper`/`BulkUploadVehiclesUseCase` stored it under
`attributes.title_state`, a key that:

- was never declared on the "Carros y Camionetas" `attribute_schema`
  (so the product edit form never rendered it, same class of bug as
  `title_status`/`clean_title` fixed in `20260925_0001`), and
- never reached the "Estado del vehículo" selector in the Facebook
  Publish form, which reads a *different*, unrelated field
  (`Product.condition`, the generic ecommerce enum — hardcoded to
  `"used"` on every CSV import, out of scope for this fix).

Fixed going forward in the same commit as this migration: the CSV
mapper/bulk-import use case now write `attributes.vehicle_condition`
directly, the client-format CSV export reads it back the same way, and
the category schema declares it as a real `select` field (mirrors the
`clean_title` field added by `20260925_0001`) — `title_state` is retired
from the codebase entirely.

This migration:

1. Adds the `vehicle_condition` field definition to the
   "Carros y Camionetas" (`carros-y-camionetas`) category's
   `attribute_schema` — the only category built from `_CAR_SCHEMA` — if
   it isn't already there (idempotent; a fresh environment already gets
   it from `seed_categories.py` on first boot).
2. Backfills already-imported products: renames
   `attributes.title_state` -> `attributes.vehicle_condition` (same
   value, no type conversion needed — both are plain strings). No
   "already had both keys" case is possible here (unlike
   `clean_title`/`title_status`): `vehicle_condition` never existed
   anywhere in the codebase before this change, so no other code path
   could have written it independently.

`downgrade()` is symmetric: removes `vehicle_condition` from the
category schema, and for products, renames
`attributes.vehicle_condition` back to `attributes.title_state` on every
row this migration touched (marked via the same NFR-SEC-4 JSONB-marker
pattern as `20260925_0001` / `20260924_0001`).
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "20260925_0002"
down_revision = "20260925_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

CARS_AND_TRUCKS_LEAF_SLUG = "carros-y-camionetas"
_MARKER = "_migration_20260925_0002_title_state_backfilled"

_VEHICLE_CONDITION_FIELD_JSON = """{
    "type": "string",
    "label": "Condición del vehículo",
    "required": false,
    "filterable": true,
    "filter_type": "select",
    "options": ["Excelente", "Muy bueno", "Bueno", "Aceptable", "Malo"],
    "group": "basic"
}"""


def _do_upgrade_schema(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = attribute_schema || jsonb_build_object(
                    'vehicle_condition', CAST(:field_def AS jsonb)
                )
            WHERE slug = :slug
              AND NOT (attribute_schema ? 'vehicle_condition')
            RETURNING id
            """
        ),
        {"field_def": _VEHICLE_CONDITION_FIELD_JSON, "slug": CARS_AND_TRUCKS_LEAF_SLUG},
    )
    logger.info(
        "reconcile_vehicle_condition: schema field added=%d",
        result.rowcount,
    )


def _do_downgrade_schema(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = attribute_schema - 'vehicle_condition'
            WHERE slug = :slug
              AND attribute_schema ? 'vehicle_condition'
            RETURNING id
            """
        ),
        {"slug": CARS_AND_TRUCKS_LEAF_SLUG},
    )
    logger.info(
        "reconcile_vehicle_condition: schema field removed=%d",
        result.rowcount,
    )


def _do_upgrade_products(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (attributes - 'title_state') || jsonb_build_object(
                    'vehicle_condition', attributes -> 'title_state',
                    CAST(:marker AS text), attributes -> 'title_state'
                )
            WHERE attributes ? 'title_state'
            RETURNING id
            """
        ),
        {"marker": _MARKER},
    )
    logger.info("reconcile_vehicle_condition: products migrated=%d", result.rowcount)


def _do_downgrade_products(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (attributes - 'vehicle_condition' - CAST(:marker AS text))
                    || jsonb_build_object('title_state', attributes -> CAST(:marker AS text))
            WHERE attributes ? CAST(:marker AS text)
            RETURNING id
            """
        ),
        {"marker": _MARKER},
    )
    logger.info("reconcile_vehicle_condition: products restored=%d", result.rowcount)


def upgrade() -> None:
    connection = op.get_bind()
    _do_upgrade_schema(connection)
    _do_upgrade_products(connection)


def downgrade() -> None:
    connection = op.get_bind()
    _do_downgrade_products(connection)
    _do_downgrade_schema(connection)
