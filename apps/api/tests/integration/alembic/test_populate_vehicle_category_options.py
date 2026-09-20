"""Integration tests for the 20260920_0001 migration: surgical population
of canonical Spanish ``options`` on every global category.

Reuses the same importlib + ``run_sync`` technique as
``test_migrate_legacy_vehicle_catalog.py``: load the migration module by
file path, drive its ``_update_categories()`` against a real Postgres
connection obtained from the async ``db_session`` fixture via
``AsyncConnection.run_sync()``.

Verifies:
    1. Rows seeded BEFORE the canonical-Spanish seed (no ``filter_type``,
       no ``options``) get ``options`` populated while other schema keys
       are preserved.
    2. Rows already carrying the canonical ``options`` are left
       untouched (idempotency).
    3. Fields without a catalog (``year``, ``mileage``, ``model``,
       ``vin``) are not touched even when they exist on the schema.
    4. ``attribute_schema`` edits made by the admin on non-``options``
       keys survive the migration.

The migration does NOT touch ``products.attributes``; that surface is
already reconciled by ``20260918_0001`` and stays out of scope here.
"""

import importlib.util
from collections.abc import AsyncGenerator, Callable
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.alembic.versions._spanish_migration_helpers import (  # type: ignore[import-not-found]
    spanish_options,
)
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "20260920_0001_populate_vehicle_category_options.py"
)


@pytest.fixture
def migration() -> Any:
    """Reload the migration module fresh for every test so module-level
    state from a previous run cannot leak across tests (function scope
    matches ``db_session`` scope and ensures isolation).
    """
    spec = importlib.util.spec_from_file_location(
        "populate_vehicle_category_options_20260920_0001", _MIGRATION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest_asyncio.fixture
async def clean_categories(db_session: AsyncSession) -> AsyncGenerator[None]:
    """Wipe every global (tenant_id IS NULL) category row before this
    test runs. The shared integration-test DB accumulates rows across
    tests when the surrounding ``db_session`` transaction rolls back,
    so each migration test must observe a pristine ``categories`` table
    to assert exact counts and avoid seeing fixtures left over from a
    previous test.
    """
    from sqlalchemy import text

    await db_session.execute(text("DELETE FROM categories WHERE tenant_id IS NULL"))
    await db_session.flush()
    yield


async def _run(db_session: AsyncSession, fn: Callable[[sa.engine.Connection], None]) -> None:
    conn = await db_session.connection()
    await conn.run_sync(fn)


async def _create_category(
    db_session: AsyncSession,
    *,
    slug: str,
    attribute_schema: dict[str, dict[str, object]] | None,
) -> CategoryModel:
    category = CategoryModel(
        id=uuid4(),
        tenant_id=None,
        slug=slug,
        name=slug,
        attribute_schema=attribute_schema,
    )
    db_session.add(category)
    await db_session.flush()
    return category


async def _reload(db_session: AsyncSession, category_id: object) -> CategoryModel:
    db_session.expire_all()
    result = await db_session.execute(select(CategoryModel).where(CategoryModel.id == category_id))
    return result.scalar_one()


async def test_populates_options_for_legacy_schema_without_filter_type(
    db_session: AsyncSession,
    test_organization: OrganizationModel,  # noqa: ARG001
    migration: Any,
    clean_categories: None,  # noqa: ARG001
) -> None:
    """A leaf whose ``attribute_schema`` predates the canonical-Spanish
    seed carries each field as a plain dict WITHOUT ``filter_type`` and
    WITHOUT ``options``. The migration must add the canonical
    ``options`` list, and it must not invent ``filter_type``.
    """
    legacy_schema = {
        "make": {"type": "string", "group": "basic", "required": True, "vin_decode_key": "make"},
        "body_type": {"type": "string", "group": "basic", "required": True},
        "year": {"type": "integer", "group": "basic", "required": True},
    }
    category = await _create_category(
        db_session,
        slug=f"legacy-cars-{uuid4().hex[:8]}",
        attribute_schema=legacy_schema,
    )
    # Flush so the row is visible to the migration's plain-SQL
    # connection, but stay inside the transaction opened by the
    # `db_session` fixture so the migration's UPDATEs see the row and the
    # surrounding teardown can roll back cleanly.
    await db_session.flush()

    await _run(db_session, migration._update_categories)

    refreshed = await _reload(db_session, category.id)
    refreshed_schema: dict[str, Any] = dict(refreshed.attribute_schema or {})

    assert refreshed_schema["make"]["options"][0] == "Acura"
    assert "Ford" in refreshed_schema["make"]["options"]
    assert refreshed_schema["body_type"]["options"] == [
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
    # Untouched schema keys are preserved.
    assert refreshed_schema["make"]["type"] == "string"
    assert refreshed_schema["make"]["group"] == "basic"
    assert refreshed_schema["make"]["required"] is True
    assert refreshed_schema["make"]["vin_decode_key"] == "make"
    # ``filter_type`` was not invented.
    assert "filter_type" not in refreshed_schema["make"]
    # ``year`` has no canonical catalog and must remain option-less.
    assert "options" not in refreshed_schema["year"]


async def test_is_idempotent_when_options_already_canonical(
    db_session: AsyncSession,
    test_organization: OrganizationModel,  # noqa: ARG001
    migration: Any,
    clean_categories: None,  # noqa: ARG001
) -> None:
    """Running the migration twice is a no-op. Categories that already
    carry the canonical ``options`` are not rewritten a second time.

    The "already canonical" condition is byte-exact equality with the
    full catalog list for the field, not just any subset — partial
    matches are deliberately upgraded to the full canonical list (this
    is a repair migration, not a no-op decorator).
    """
    full_canonical_options = spanish_options("make")
    assert full_canonical_options is not None and len(full_canonical_options) > 0
    canonical_schema = {
        "make": {
            "type": "string",
            "group": "basic",
            "required": True,
            "filter_type": "select",
            "options": list(full_canonical_options),
        },
    }
    category = await _create_category(
        db_session,
        slug=f"already-canonical-{uuid4().hex[:8]}",
        attribute_schema=canonical_schema,
    )
    await db_session.flush()

    await _run(db_session, migration._update_categories)
    refreshed = await _reload(db_session, category.id)
    # Running once on an already-canonical row must not change it.
    assert refreshed.attribute_schema["make"]["options"] == list(full_canonical_options)

    # A second run must remain a no-op too.
    await _run(db_session, migration._update_categories)
    refreshed_again = await _reload(db_session, category.id)
    assert refreshed_again.attribute_schema["make"]["options"] == list(full_canonical_options)


async def test_preserves_admin_edited_keys_outside_options(
    db_session: AsyncSession,
    test_organization: OrganizationModel,  # noqa: ARG001
    migration: Any,
    clean_categories: None,  # noqa: ARG001
) -> None:
    """An admin who added ``help_text`` or ``validation_status`` must
    not lose those edits. Only ``options`` is filled/replaced; every
    other key of the field dict is preserved verbatim.
    """
    admin_edited_schema = {
        "make": {
            "type": "string",
            "group": "basic",
            "required": True,
            "help_text": "Seleccioná la marca oficial del vehículo",
            "validation_status": "approved_by_legal",
            "vin_decode_key": "make",
        },
    }
    category = await _create_category(
        db_session,
        slug=f"admin-edited-{uuid4().hex[:8]}",
        attribute_schema=admin_edited_schema,
    )
    await db_session.flush()

    await _run(db_session, migration._update_categories)

    refreshed = await _reload(db_session, category.id)
    refreshed_make: dict[str, Any] = refreshed.attribute_schema["make"]
    assert refreshed_make["help_text"] == "Seleccioná la marca oficial del vehículo"
    assert refreshed_make["validation_status"] == "approved_by_legal"
    assert refreshed_make["vin_decode_key"] == "make"
    assert refreshed_make["options"][0] == "Acura"


async def test_skips_categories_with_null_attribute_schema(
    db_session: AsyncSession,
    test_organization: OrganizationModel,  # noqa: ARG001
    migration: Any,
    clean_categories: None,  # noqa: ARG001
) -> None:
    """A category whose ``attribute_schema`` is NULL is left untouched
    (the documented repair path for those is ``FORCE_SEED=1``).
    """
    category = await _create_category(
        db_session,
        slug=f"no-schema-{uuid4().hex[:8]}",
        attribute_schema=None,
    )
    await db_session.flush()

    await _run(db_session, migration._update_categories)

    refreshed = await _reload(db_session, category.id)
    assert refreshed.attribute_schema is None


async def test_skips_non_select_fields_without_canonical_catalog(
    db_session: AsyncSession,
    test_organization: OrganizationModel,  # noqa: ARG001
    migration: Any,
    clean_categories: None,  # noqa: ARG001
) -> None:
    """Fields whose ``field_key`` is NOT in the canonical catalog
    (``year``, ``mileage``, ``model``, ``vin``) are not touched, even if
    the schema declares a non-``select`` filter_type or none at all.
    """
    schema = {
        "make": {"type": "string", "required": True},
        "year": {"type": "integer", "required": True},
        "mileage": {"type": "integer", "required": False},
        "model": {"type": "string", "required": True},
        "vin": {"type": "string", "required": False},
    }
    category = await _create_category(
        db_session,
        slug=f"free-text-{uuid4().hex[:8]}",
        attribute_schema=schema,
    )
    await db_session.flush()

    await _run(db_session, migration._update_categories)

    refreshed = await _reload(db_session, category.id)
    refreshed_schema: dict[str, Any] = refreshed.attribute_schema
    assert "options" in refreshed_schema["make"]
    for field_key in ("year", "mileage", "model", "vin"):
        assert "options" not in refreshed_schema[field_key], (
            f"{field_key} must remain option-less — it has no canonical catalog"
        )
