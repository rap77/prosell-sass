"""Backfill cover_image_key and category_id for bulk CSV-imported vehicles.

Revision ID: 20260924_0001
Revises: 20260922_0001
Create Date: 2026-09-24

Two independent, guarded data-quality fixes for `BulkUploadVehiclesUseCase`
(`import-client-csv` admin wizard) — a real production bug reported for a
newly-imported organization's batch, root-caused the same session:

1. **Cover fallback backfill.** `BulkUploadVehiclesUseCase` only ever
   populates `image_urls`; it never sets `cover_image_key` or
   `thumbnail_image_key`. The catalog-grid batch cover-URL endpoint
   (`POST /products/image-urls:batch`) only checks those two fields and
   silently drops any product where both are null — so bulk-imported
   vehicles had real photos but showed no thumbnail in the grid, even
   though the edit form's gallery endpoint (which reads the whole
   `image_urls` list) displayed them fine. Fixed going forward in the
   same commit as this migration (product_router.py now falls back to
   the first gallery image); this backfills `cover_image_key` for
   already-imported rows so they don't have to wait for a future edit.

2. **Category re-point backfill.** `import-client-csv/page.tsx` resolved
   `category_id` to the "Vehículos y Transporte" VERTICAL (root,
   `vehiculos-y-transporte`), which carries no `attribute_schema` of its
   own — instead of the "Carros y Camionetas" LEAF
   (`carros-y-camionetas`, 3 levels down), the only category with the
   real vehicle schema (`_CAR_SCHEMA`, seed_categories.py). Every vehicle
   imported through this wizard therefore got a schema-less category, so
   its edit form could only render generic/basic fields — the attributes
   (make/model/year/VIN/etc.) were saved correctly, just not renderable.
   Fixed going forward in the same commit (page.tsx now submits the
   leaf's id); this re-points already-imported products.

Both backfills are guarded (existence + anti-drift re-check right before
each write) and skip entirely if their target category is missing (fresh
environments without the vehicles vertical seeded). `downgrade()` is
symmetric: each touched row is marked with a JSONB key under `attributes`
recording its pre-migration state (NFR-SEC-4 pattern already used by
`20260917_0001_migrate_legacy_vehicle_catalog.py` — no dedicated audit
table for non-sensitive product data), and downgrade only reverts rows
carrying that migration's own marker — never a blanket revert that would
also catch products correctly imported AFTER this fix ships.
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "20260924_0001"
down_revision = "20260922_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

VEHICLES_VERTICAL_SLUG = "vehiculos-y-transporte"
CARS_AND_TRUCKS_LEAF_SLUG = "carros-y-camionetas"

_COVER_MARKER = "_migration_20260924_cover_backfilled"
_CATEGORY_MARKER = "_migration_20260924_category_backfilled"


def _category_id_by_slug(connection: sa.engine.Connection, slug: str) -> object | None:
    return connection.execute(
        sa.text("SELECT id FROM categories WHERE slug = :slug"),
        {"slug": slug},
    ).scalar_one_or_none()


# ---------------------------------------------------------------------------
# Backfill 1: cover_image_key <- image_urls[0]
# ---------------------------------------------------------------------------


def _do_upgrade_cover_backfill(connection: sa.engine.Connection) -> None:
    candidates = connection.execute(
        sa.text(
            """
            SELECT id, image_urls->>0 AS first_image
            FROM products
            WHERE cover_image_key IS NULL
              AND thumbnail_image_key IS NULL
              AND image_urls IS NOT NULL
              AND jsonb_array_length(image_urls) > 0
            """
        )
    ).fetchall()

    migrated = 0
    excluded = 0

    for row in candidates:
        # Anti-drift: re-read right before applying — another process may
        # have set a cover/thumbnail or changed image_urls in the meantime.
        current = connection.execute(
            sa.text(
                """
                SELECT cover_image_key, thumbnail_image_key, image_urls->>0 AS first_image
                FROM products WHERE id = :id
                """
            ),
            {"id": row.id},
        ).fetchone()

        if (
            current is None
            or current.cover_image_key is not None
            or current.thumbnail_image_key is not None
            or current.first_image != row.first_image
        ):
            logger.info(
                "backfill_bulk_import_cover: excluded product=%s reason=state_drifted",
                row.id,
            )
            excluded += 1
            continue

        connection.execute(
            sa.text(
                """
                UPDATE products
                SET cover_image_key = :first_image,
                    attributes = jsonb_set(
                        attributes, CAST(ARRAY[:marker] AS text[]), 'true'::jsonb
                    )
                WHERE id = :id
                """
            ),
            {"first_image": row.first_image, "marker": _COVER_MARKER, "id": row.id},
        )
        logger.info("backfill_bulk_import_cover: migrated product=%s", row.id)
        migrated += 1

    logger.info("backfill_bulk_import_cover: done — migrated=%d excluded=%d", migrated, excluded)


def _do_downgrade_cover_backfill(connection: sa.engine.Connection) -> None:
    rows = connection.execute(
        sa.text(
            """
            SELECT id FROM products
            WHERE attributes ? :marker
            """
        ),
        {"marker": _COVER_MARKER},
    ).fetchall()

    for row in rows:
        connection.execute(
            sa.text(
                """
                UPDATE products
                SET cover_image_key = NULL,
                    attributes = attributes - :marker
                WHERE id = :id
                """
            ),
            {"marker": _COVER_MARKER, "id": row.id},
        )

    logger.info("backfill_bulk_import_cover: downgrade restored=%d", len(rows))


# ---------------------------------------------------------------------------
# Backfill 2: category_id vertical -> "Carros y Camionetas" leaf
# ---------------------------------------------------------------------------


def _do_upgrade_category_backfill(connection: sa.engine.Connection) -> None:
    vertical_id = _category_id_by_slug(connection, VEHICLES_VERTICAL_SLUG)
    leaf_id = _category_id_by_slug(connection, CARS_AND_TRUCKS_LEAF_SLUG)

    if vertical_id is None or leaf_id is None:
        logger.info(
            "backfill_bulk_import_category: skipped — vertical or leaf category "
            "not seeded in this environment"
        )
        return

    candidates = connection.execute(
        sa.text("SELECT id FROM products WHERE category_id = :vertical_id"),
        {"vertical_id": vertical_id},
    ).fetchall()

    migrated = 0
    excluded = 0

    for row in candidates:
        # Anti-drift: re-read right before applying.
        current_category_id = connection.execute(
            sa.text("SELECT category_id FROM products WHERE id = :id"),
            {"id": row.id},
        ).scalar_one_or_none()

        if current_category_id != vertical_id:
            logger.info(
                "backfill_bulk_import_category: excluded product=%s reason=state_drifted",
                row.id,
            )
            excluded += 1
            continue

        connection.execute(
            sa.text(
                """
                UPDATE products
                SET category_id = :leaf_id,
                    attributes = jsonb_set(
                        attributes,
                        CAST(ARRAY[:marker] AS text[]),
                        to_jsonb(CAST(:vertical_id AS text))
                    )
                WHERE id = :id
                """
            ),
            {
                "leaf_id": leaf_id,
                "marker": _CATEGORY_MARKER,
                "vertical_id": str(vertical_id),
                "id": row.id,
            },
        )
        logger.info("backfill_bulk_import_category: migrated product=%s", row.id)
        migrated += 1

    logger.info("backfill_bulk_import_category: done — migrated=%d excluded=%d", migrated, excluded)


def _do_downgrade_category_backfill(connection: sa.engine.Connection) -> None:
    rows = connection.execute(
        sa.text(
            """
            SELECT id, attributes->>:marker AS old_category_id
            FROM products
            WHERE attributes ? :marker
            """
        ),
        {"marker": _CATEGORY_MARKER},
    ).fetchall()

    for row in rows:
        connection.execute(
            sa.text(
                """
                UPDATE products
                SET category_id = CAST(:old_category_id AS uuid),
                    attributes = attributes - :marker
                WHERE id = :id
                """
            ),
            {"old_category_id": row.old_category_id, "marker": _CATEGORY_MARKER, "id": row.id},
        )

    logger.info("backfill_bulk_import_category: downgrade restored=%d", len(rows))


def upgrade() -> None:
    connection = op.get_bind()
    _do_upgrade_cover_backfill(connection)
    _do_upgrade_category_backfill(connection)


def downgrade() -> None:
    connection = op.get_bind()
    _do_downgrade_category_backfill(connection)
    _do_downgrade_cover_backfill(connection)
