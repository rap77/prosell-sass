"""Reconcile clean_title attribute — retire title_status enum, unify on
boolean clean_title (matches the vehicle Category schema + FB sync).

Revision ID: 20260925_0001
Revises: 20260924_0001
Create Date: 2026-09-25

Root cause (reported live by the user against a CSV-imported batch): the
CSV bulk-import wizard (`BulkUploadVehiclesUseCase`/`CSVFieldMapper`) wrote
`attributes.title_status: "clean"|"rebuilt"` — a key the vehicle Category
schema (`seed_categories.py`, field `clean_title: boolean`, label "Título
limpio") never declared, and the checkbox the product edit form renders
for that schema field never read. The Facebook sync router
(`fb_sync_router.py`) independently reads `attributes.clean_title` as a
plain boolean — the SAME key the schema expects. So every CSV-imported
vehicle carried the right value under the wrong key: the checkbox always
rendered unchecked, regardless of what `1`/`0` the CSV's `clean_title`
column actually carried.

Fixed going forward in the same commit as this migration: the CSV
mapper/bulk-import use case now write `attributes.clean_title` (bool)
directly, and the client-format CSV export reads it back the same way —
`title_status` is retired from the codebase entirely.

This migration backfills already-imported rows:

- Row has `title_status` but no `clean_title` yet (the common case): derive
  `clean_title = (title_status == "clean")`.
- Row already has BOTH keys (edited via the product form, or synced to
  Facebook, some time after the code fix shipped but before this migration
  ran): trust the existing `clean_title` — never overwrite a real admin
  edit — and just drop the now-stale `title_status` key.

`downgrade()` is symmetric: each touched row is marked with a JSONB key
recording its pre-migration `title_status` value, plus a second marker
recording whether `clean_title` pre-existed on that row (so downgrade
knows whether to strip the `clean_title` it created, or leave alone one
that already existed independently) — same NFR-SEC-4 marker pattern as
`20260917_0001_migrate_legacy_vehicle_catalog.py` /
`20260924_0001_backfill_bulk_import_cover_and_category.py`. Downgrade only
restores rows carrying its own markers.
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "20260925_0001"
down_revision = "20260924_0001"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

_MARKER_TITLE_STATUS = "_migration_20260925_title_status_backfilled"
_MARKER_CLEAN_TITLE_PREEXISTED = "_migration_20260925_clean_title_preexisted"


def _do_upgrade(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (attributes - 'title_status') || jsonb_build_object(
                    'clean_title',
                    CASE
                        WHEN attributes ? 'clean_title' THEN attributes -> 'clean_title'
                        ELSE to_jsonb(attributes ->> 'title_status' = 'clean')
                    END,
                    CAST(:marker_status AS text), attributes ->> 'title_status',
                    CAST(:marker_preexisted AS text), to_jsonb(attributes ? 'clean_title')
                )
            WHERE attributes ? 'title_status'
            RETURNING id
            """
        ),
        {
            "marker_status": _MARKER_TITLE_STATUS,
            "marker_preexisted": _MARKER_CLEAN_TITLE_PREEXISTED,
        },
    )
    migrated = result.rowcount
    logger.info("reconcile_clean_title: migrated=%d", migrated)


def _do_downgrade(connection: sa.engine.Connection) -> None:
    # Case 1: clean_title did NOT preexist — this migration created it —
    # remove it and restore the old title_status.
    created = connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (
                    attributes
                    - 'clean_title'
                    - CAST(:marker_status AS text)
                    - CAST(:marker_preexisted AS text)
                ) || jsonb_build_object('title_status', attributes ->> CAST(:marker_status AS text))
            WHERE attributes ? CAST(:marker_status AS text)
              AND (attributes ->> CAST(:marker_preexisted AS text)) = 'false'
            RETURNING id
            """
        ),
        {
            "marker_status": _MARKER_TITLE_STATUS,
            "marker_preexisted": _MARKER_CLEAN_TITLE_PREEXISTED,
        },
    )

    # Case 2: clean_title already existed independently — leave it as-is,
    # only restore title_status and drop the markers.
    preexisting = connection.execute(
        sa.text(
            """
            UPDATE products
            SET attributes = (
                    attributes - CAST(:marker_status AS text) - CAST(:marker_preexisted AS text)
                ) || jsonb_build_object('title_status', attributes ->> CAST(:marker_status AS text))
            WHERE attributes ? CAST(:marker_status AS text)
              AND (attributes ->> CAST(:marker_preexisted AS text)) = 'true'
            RETURNING id
            """
        ),
        {
            "marker_status": _MARKER_TITLE_STATUS,
            "marker_preexisted": _MARKER_CLEAN_TITLE_PREEXISTED,
        },
    )

    logger.info(
        "reconcile_clean_title: downgrade restored=%d (created=%d, preexisting=%d)",
        created.rowcount + preexisting.rowcount,
        created.rowcount,
        preexisting.rowcount,
    )


def upgrade() -> None:
    connection = op.get_bind()
    _do_upgrade(connection)


def downgrade() -> None:
    connection = op.get_bind()
    _do_downgrade(connection)
