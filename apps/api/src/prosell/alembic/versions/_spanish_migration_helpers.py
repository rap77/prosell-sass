"""Helpers extracted from 20260918_0001_migrate_vehicle_values_to_spanish.py.

The migration script itself is a module-level alembic revision (not
importable from a test without the alembic env wired up), so the SQL
string-builders and option-lookups live here as plain functions and are
imported by both the migration script and the unit tests.

Keep this module dependency-light: only stdlib + FACEBOOK_VEHICLE_VALUE_CATALOG.
"""

import json
from typing import Final

from prosell.domain.services.facebook_vehicle_value_catalog import (
    FACEBOOK_VEHICLE_VALUE_CATALOG,
)

_PRE_MARKER_PREFIX: Final[str] = "_pre_spanish_migration_"


def spanish_field_keys() -> tuple[str, ...]:
    """Every field_key with a canonical Spanish catalog (insertion order)."""
    return tuple(FACEBOOK_VEHICLE_VALUE_CATALOG.keys())


def spanish_options(field_key: str) -> list[str] | None:
    """Return the canonical Spanish values for `field_key`, or None when
    the field has no catalog (e.g. ``year``, ``mileage``).
    """
    options = FACEBOOK_VEHICLE_VALUE_CATALOG.get(field_key)
    if not options:
        return None
    return [option.canonical_value for option in options]


def pre_migration_marker_key(field_key: str) -> str:
    """JSONB key under which downgrade() restores the pre-migration raw
    value. Per the precedent of 20260917_0001 and 20260812_0002.
    """
    return f"{_PRE_MARKER_PREFIX}{field_key}"


def build_update_statement(
    *,
    product_id: str,
    field_key: str,
    old_value: str,
    new_value: str,
) -> tuple[str, dict]:
    """Construct the parametrized UPDATE statement that stashes the
    pre-migration raw value under the marker key AND sets the canonical
    value, atomically. Returns (sql, params).

    The dict is what alembic's connection.execute binds — values are
    passed as native Python types (not as sa.func.* expressions) so the
    DBAPI can serialize them through text() placeholders.
    """
    marker_key = pre_migration_marker_key(field_key)
    sql = (
        "UPDATE products "
        "SET attributes = jsonb_set("
        "jsonb_set("
        "attributes, "
        "CAST(ARRAY[:marker_key] AS text[]), "
        "to_jsonb(CAST(:old_value AS text))"
        "), "
        "CAST(ARRAY[:field_key] AS text[]), "
        "to_jsonb(CAST(:new_value AS text))"
        ") "
        "WHERE id = :id"
    )
    params = {
        "marker_key": marker_key,
        "field_key": field_key,
        "old_value": old_value,
        "new_value": new_value,
        "id": product_id,
    }
    return sql, params


def serialize_jsonb(payload: dict | list) -> str:
    """JSON-encode a dict/list for binding into a ``:schema`` parameter
    that lands in a JSONB column via ``CAST(:schema AS jsonb)``.

    Use this (NOT ``sa.func.jsonb_dumps`` — SQLAlchemy function
    expressions cannot be bound through text() placeholders).
    """
    return json.dumps(payload)
