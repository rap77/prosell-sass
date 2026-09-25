"""Add depends_on/options_source metadata to the `model` field so the
product form renders it as a make -> model dependent select (NHTSA-backed)
instead of a free-text input.

Revision ID: 20260925_0003
Revises: 20260925_0002
Create Date: 2026-09-25

Companion to the new `GET /vehicles/models?make=...` endpoint (NHTSA
vPIC `GetModelsForMake`, reusing the existing VIN-decode integration) and
the `SchemaFieldRenderer` change that watches the sibling `make` field
and fetches its options from there when a field declares
`options_source: "nhtsa_models"`.

Only patches the "Carros y Camionetas" (`carros-y-camionetas`) category —
the only one built from `_CAR_SCHEMA` — and only the `model` field's
definition; every other key on it (`type`, `required`, `filterable`,
`filter_type`, `vin_decode_key`, `group` — whatever an admin may have
edited) is left untouched. Idempotent: skips rows that already carry
`options_source` on `model` (a fresh environment already gets it from
`seed_categories.py` on first boot).

`downgrade()` removes both new keys from `model`, restoring the free-text
behavior — safe because `depends_on`/`options_source` never existed
anywhere in the codebase before this change, so nothing else could have
written them independently (same reasoning as `20260925_0002`, no
marker/anti-overwrite logic needed).
"""

import logging

import sqlalchemy as sa
from alembic import op

revision = "20260925_0003"
down_revision = "20260925_0002"
branch_labels = None
depends_on = None

logger = logging.getLogger(__name__)

CARS_AND_TRUCKS_LEAF_SLUG = "carros-y-camionetas"


def _do_upgrade(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = jsonb_set(
                    attribute_schema,
                    '{model}',
                    (attribute_schema -> 'model')
                        || jsonb_build_object(
                            'depends_on', 'make',
                            'options_source', 'nhtsa_models'
                        )
                )
            WHERE slug = :slug
              AND attribute_schema ? 'model'
              AND NOT (attribute_schema -> 'model' ? 'options_source')
            RETURNING id
            """
        ),
        {"slug": CARS_AND_TRUCKS_LEAF_SLUG},
    )
    logger.info("add_model_dependent_select: categories patched=%d", result.rowcount)


def _do_downgrade(connection: sa.engine.Connection) -> None:
    result = connection.execute(
        sa.text(
            """
            UPDATE categories
            SET attribute_schema = jsonb_set(
                    attribute_schema,
                    '{model}',
                    (attribute_schema -> 'model') - 'depends_on' - 'options_source'
                )
            WHERE slug = :slug
              AND attribute_schema -> 'model' ? 'options_source'
            RETURNING id
            """
        ),
        {"slug": CARS_AND_TRUCKS_LEAF_SLUG},
    )
    logger.info("add_model_dependent_select: categories reverted=%d", result.rowcount)


def upgrade() -> None:
    connection = op.get_bind()
    _do_upgrade(connection)


def downgrade() -> None:
    connection = op.get_bind()
    _do_downgrade(connection)
