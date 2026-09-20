"""Populate Spanish canonical `options` on every vehicle category `attribute_schema`.

Revision ID: 20260920_0001
Revises: 20260918_0001
Create Date: 2026-09-20

Companion to the deployment of commits ``d6069110`` (Spanish options added
to ``seed_categories._CAR_SCHEMA``) and ``c13f9e3e`` (FACEBOOK canonical
Spanish values) plus the BR4.x reconciler ``20260918_0001``.

``20260918_0001`` only fills ``options`` when ``filter_type == "select"`` is
already declared. Production rows seeded BEFORE commit ``d6069110`` reach
main do not carry ``filter_type: "select"`` on fields like ``make`` /
``body_type`` (because the seed at the time wrote them as plain strings),
so the earlier migration skipped them. The schema rows are then
"incomplete" from the product form's point of view — the field shows up
but with no options, so ``Category.validate_attributes()`` cannot enforce
a curated vocabulary against published products.

This migration walks every ``categories`` row (``tenant_id IS NULL``) and,
for each field in its ``attribute_schema`` whose ``field_key`` is in the
Spanish canonical catalog, ensures ``options`` equals the canonical list:

*   Adds ``options`` when missing.
*   Replaces ``options`` whose contents differ from the canonical list.
*   Leaves every other key of the field untouched (``type``, ``required``,
    ``filterable``, ``filter_type``, ``vin_decode_key``, ``group``,
    ``help_text``, ``validation_status`` — whatever the admin edited).
*   Skips fields whose ``field_key`` is not in the canonical catalog
    (``year``, ``mileage``, ``model``, ``vin`` — free-form).
*   Skips fields whose ``options`` already equal the canonical list
    (idempotent).
*   Skips rows with ``attribute_schema`` NULL.

Downgrade is intentionally a no-op for data (mirrors ``20260918_0001``):
restoring the pre-migration ``options`` exactly is unnecessary because
re-running ``seed_global_taxonomy(force=False)`` followed by
``seed_global_taxonomy(force=True)`` is the documented repair path and
preserves admin-edited schema fields outside ``options``.
"""

import logging
from datetime import UTC, datetime

import sqlalchemy as sa
from alembic import op

from prosell.alembic.versions._spanish_migration_helpers import (
    serialize_jsonb,
    spanish_field_keys,
    spanish_options,
)

revision = "20260920_0001"
down_revision = "20260918_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)


def _update_categories(connection: sa.engine.Connection) -> int:
    """For every global category row, ensure each field with a canonical
    Spanish catalog carries the canonical ``options`` list. Returns the
    number of categories whose ``attribute_schema`` was rewritten.

    Idempotent: a row whose every field with a catalog already has the
    canonical ``options`` list is left untouched.
    """
    updated = 0
    rows = connection.execute(
        sa.text(
            """
            SELECT id, slug, attribute_schema
            FROM categories
            WHERE tenant_id IS NULL
            """
        )
    ).fetchall()
    for row in rows:
        if row.attribute_schema is None:
            continue
        schema = dict(row.attribute_schema)
        changed = False
        for field_key, entry in schema.items():
            if not isinstance(entry, dict):
                continue
            canonical = spanish_options(field_key)
            if canonical is None:
                continue
            current = entry.get("options")
            if current == canonical:
                continue
            schema[field_key] = {**entry, "options": canonical}
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
                "schema": serialize_jsonb(schema),
                "updated_at": datetime.now(UTC),
                "id": row.id,
            },
        )
        updated += 1
        logger.info(
            "populate_vehicle_category_options: updated category slug=%s id=%s",
            row.slug,
            row.id,
        )
    return updated


def upgrade() -> None:
    """Add canonical Spanish ``options`` to every category field with a
    canonical catalog, preserving all other schema fields.
    """
    updated = _update_categories(op.get_bind())
    field_keys_with_catalog = len(spanish_field_keys())
    logger.info(
        "populate_vehicle_category_options: done — categories_updated=%d catalog_field_keys=%d",
        updated,
        field_keys_with_catalog,
    )


def downgrade() -> None:
    """No-op downgrade.

    Rolling back this migration without restoring the pre-migration
    ``options`` is intentional and matches the precedent set by
    ``20260918_0001``: re-seeding with ``FORCE_SEED=1`` is the documented
    repair path and preserves admin edits to non-``options`` schema
    fields.
    """
    logger.info("populate_vehicle_category_options: downgrade is a no-op")
