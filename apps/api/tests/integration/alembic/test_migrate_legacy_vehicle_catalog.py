"""Integration tests for the 20260917_0001 migration (u1-vehicle-catalog-api, BR3.1).

Loads the migration module directly via importlib (its filename starts with
digits, same technique as tests/unit/scripts/test_fix_image_urls_keys.py)
and drives its `_do_upgrade()`/`_do_downgrade()` — the same sync-Connection
entry points Alembic's `upgrade()`/`downgrade()` call via `op.get_bind()` —
against a real Postgres connection obtained from the async `db_session`
fixture via `AsyncConnection.run_sync()` (the exact technique
`alembic/env.py`'s `run_async_migrations()` uses to run migrations on an
async engine).

The domain catalog's own correctness (which values reconcile) is already
exhaustively tested in test_facebook_vehicle_value_catalog.py — these
tests verify the migration's SQL/guard *mechanism* (existence, catalog
match, anti-drift, idempotency, downgrade symmetry), isolating it from the
current catalog's specific contents via monkeypatching where the guard
under test isn't guard 2.
"""

import importlib.util
from collections.abc import Callable
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "20260917_0001_migrate_legacy_vehicle_catalog.py"
)


@pytest.fixture(scope="module")
def migration() -> Any:
    spec = importlib.util.spec_from_file_location(
        "migrate_legacy_vehicle_catalog_20260917_0001", _MIGRATION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


async def _run(db_session: AsyncSession, fn: Callable[[sa.engine.Connection], None]) -> None:
    conn = await db_session.connection()
    await conn.run_sync(fn)


async def _create_product(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    *,
    attributes: dict[str, object],
) -> ProductModel:
    product = ProductModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        organization_id=test_organization.id,
        category_id=test_category.id,
        title="Legacy Test Vehicle",
        price_cents=1_000_000,
        status="published",
        attributes=attributes,
    )
    db_session.add(product)
    await db_session.flush()
    return product


async def _reload(db_session: AsyncSession, product_id: object) -> ProductModel:
    db_session.expire_all()
    result = await db_session.execute(select(ProductModel).where(ProductModel.id == product_id))
    row = result.scalar_one()
    return row


# ── BR3.1 guard 2 (catalog match) — realistic, unpatched case ──────────────


@pytest.mark.asyncio
async def test_upgrade_excludes_legacy_value_with_no_catalog_match(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
) -> None:
    """A candidate (non-canonical) value that FacebookVehicleValueCatalog
    cannot reconcile is excluded — the attribute is left untouched, no
    marker key is added."""
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "totally-unrecognized-legacy-value"},
    )

    await _run(db_session, migration._do_upgrade)

    reloaded = await _reload(db_session, product.id)
    assert reloaded.attributes["body_type"] == "totally-unrecognized-legacy-value"
    assert "_pre_migration_body_type" not in reloaded.attributes


# ── BR3.1 guard 2 succeeding — isolated via a patched reconcile() ──────────


@pytest.mark.asyncio
async def test_upgrade_migrates_when_the_value_reconciles(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """When guard 2 (catalog match) succeeds, the attribute is updated to
    the reconciled canonical value AND the pre-migration raw value is
    stashed under a marker key (for downgrade() symmetry)."""
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "legacy-suv-spelling"},
    )

    monkeypatch.setattr(
        migration,
        "reconcile",
        lambda _field_key, raw_value: "suv" if raw_value == "legacy-suv-spelling" else None,
    )

    await _run(db_session, migration._do_upgrade)

    reloaded = await _reload(db_session, product.id)
    assert reloaded.attributes["body_type"] == "suv"
    assert reloaded.attributes["_pre_migration_body_type"] == "legacy-suv-spelling"


@pytest.mark.asyncio
async def test_upgrade_is_idempotent(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Running the migration a second time makes no further changes — the
    record is no longer a candidate once its value is already canonical."""
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "legacy-suv-spelling"},
    )

    monkeypatch.setattr(
        migration,
        "reconcile",
        lambda _field_key, raw_value: "suv" if raw_value == "legacy-suv-spelling" else None,
    )

    await _run(db_session, migration._do_upgrade)
    after_first_run = (await _reload(db_session, product.id)).attributes

    await _run(db_session, migration._do_upgrade)
    after_second_run = (await _reload(db_session, product.id)).attributes

    assert after_second_run == after_first_run
    assert after_second_run["body_type"] == "suv"
    assert after_second_run["_pre_migration_body_type"] == "legacy-suv-spelling"


# ── BR3.1 guard 1 (product still exists) ───────────────────────────────────


@pytest.mark.asyncio
async def test_upgrade_excludes_when_product_no_longer_exists(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A record deleted between the candidate batch being built and applied
    is excluded — guard 1 — isolated here by forcing `_product_exists()`
    to report False regardless of the real (still-present) row, so the
    test proves the guard aborts the write rather than relying on a real
    concurrent delete."""
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "legacy-suv-spelling"},
    )

    monkeypatch.setattr(
        migration,
        "reconcile",
        lambda _field_key, raw_value: "suv" if raw_value == "legacy-suv-spelling" else None,
    )
    monkeypatch.setattr(migration, "_product_exists", lambda _connection, _product_id: False)

    await _run(db_session, migration._do_upgrade)

    reloaded = await _reload(db_session, product.id)
    assert reloaded.attributes["body_type"] == "legacy-suv-spelling"
    assert "_pre_migration_body_type" not in reloaded.attributes


# ── BR3.1 guard 3 (anti-drift) ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upgrade_excludes_when_value_drifted_since_batch_was_built(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """A record whose value changed between the candidate batch being built
    and applied is excluded — guard 3 — isolated by forcing
    `_current_attribute_value()` to report a value different from the one
    `_find_candidates()` captured, simulating a concurrent modification
    within a single migration run."""
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "legacy-suv-spelling"},
    )

    monkeypatch.setattr(
        migration,
        "reconcile",
        lambda _field_key, raw_value: "suv" if raw_value == "legacy-suv-spelling" else None,
    )
    monkeypatch.setattr(
        migration,
        "_current_attribute_value",
        lambda _connection, _product_id, _field_key: "drifted-value",
    )

    await _run(db_session, migration._do_upgrade)

    reloaded = await _reload(db_session, product.id)
    assert reloaded.attributes["body_type"] == "legacy-suv-spelling"
    assert "_pre_migration_body_type" not in reloaded.attributes


# ── downgrade() symmetry ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_downgrade_restores_the_original_value_and_removes_the_marker(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    test_category: CategoryModel,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    product = await _create_product(
        db_session,
        test_organization,
        test_category,
        attributes={"body_type": "legacy-suv-spelling"},
    )

    monkeypatch.setattr(
        migration,
        "reconcile",
        lambda _field_key, raw_value: "suv" if raw_value == "legacy-suv-spelling" else None,
    )

    await _run(db_session, migration._do_upgrade)
    migrated = await _reload(db_session, product.id)
    assert migrated.attributes["body_type"] == "suv"

    await _run(db_session, migration._do_downgrade)
    restored = await _reload(db_session, product.id)

    assert restored.attributes["body_type"] == "legacy-suv-spelling"
    assert "_pre_migration_body_type" not in restored.attributes
