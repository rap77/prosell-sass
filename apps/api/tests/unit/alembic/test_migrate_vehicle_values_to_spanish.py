"""Unit — Spanish-language vehicle catalog migration helpers.

Tests for the public helpers in 20260918_0001_migrate_vehicle_values_to_spanish.py
that don't require a database: the canonical-options lookup and the
product-row UPDATE statement construction. The full alembic upgrade /
downgrade cycle is covered by integration tests (test_migration_*.py)
that need a running test DB on localhost:5433.
"""

from prosell.alembic.versions._spanish_migration_helpers import (  # type: ignore[import-not-found]
    build_update_statement,
    pre_migration_marker_key,
    spanish_field_keys,
    spanish_options,
)


def test_spanish_options_for_known_field_key():
    """FACEBOOK_VEHICLE_VALUE_CATALOG is the source of truth — the helper
    surfaces only the canonical_value list, no legacy aliases.
    """
    assert spanish_options("body_type") == [
        "SUV",
        "Sedán",
        "Camioneta",
        "Coupé",
        "Hatchback",
        "Convertible",
        "Familiar",
        "Miniván",
        "Auto pequeño",
        "Otro",
    ]
    assert spanish_options("transmission") == [
        "Transmisión automática",
        "Transmisión manual",
    ]


def test_spanish_options_for_unknown_field_key_returns_none():
    """Fields with no catalog (year, mileage, model) return None — the
    migration skips them.
    """
    assert spanish_options("year") is None
    assert spanish_options("mileage") is None
    assert spanish_options("model") is None


def test_spanish_field_keys_matches_catalog_keys():
    """Helper returns every field_key with a catalog, in insertion order.
    Used by the migration to iterate over FACEBOOK_VEHICLE_VALUE_CATALOG
    without re-importing the catalog inside helper modules.
    """
    keys = spanish_field_keys()
    assert "make" in keys
    assert "body_type" in keys
    assert "year" not in keys  # year has no catalog (range, not select)


def test_pre_migration_marker_key():
    """The marker key namespace for downgrade() restoration."""
    assert pre_migration_marker_key("body_type") == "_pre_spanish_migration_body_type"


def test_build_update_statement_round_trip():
    """The product UPDATE must stash the pre-migration value AND set the
    canonical_value atomically, in one statement (not two — concurrent
    reads between two statements could see a half-applied migration).
    """
    sql, params = build_update_statement(
        product_id="00000000-0000-0000-0000-000000000001",
        field_key="body_type",
        old_value="suv",
        new_value="SUV",
    )
    assert "jsonb_set" in sql
    assert ":marker_key" in sql
    assert ":old_value" in sql
    assert ":new_value" in sql
    assert ":id" in sql
    assert params == {
        "marker_key": "_pre_spanish_migration_body_type",
        "field_key": "body_type",
        "old_value": "suv",
        "new_value": "SUV",
        "id": "00000000-0000-0000-0000-000000000001",
    }
