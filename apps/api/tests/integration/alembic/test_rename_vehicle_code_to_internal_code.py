"""Integration tests for the rename-vehicle_code-to-internal_code migration.

The migration renames `vehicle_code` to `internal_code` everywhere it
appears: `Product.attributes`, `Category.attribute_schema`,
`Category.attribute_groups`' field lists, the functional unique index,
and the enforcement trigger/function/sequence. Values are preserved
verbatim — only the key/object names change.

Mirrors the migration-test pattern from
`test_enforce_vehicle_code_required.py` (importlib load + sync
`_do_upgrade`/`_do_downgrade` entry points driven via
`conn.run_sync(fn)`).
"""

import importlib.util
from collections.abc import AsyncIterator, Callable
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
import pytest_asyncio
import sqlalchemy as sa
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from tests.integration._constants import TEST_DB_URL

from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel

_MIGRATION_PATH = (
    Path(__file__).resolve().parents[3]
    / "alembic"
    / "versions"
    / "20261002_0001_rename_vehicle_code_to_internal_code.py"
)


@pytest.fixture(scope="module")
def migration() -> Any:
    spec = importlib.util.spec_from_file_location(
        "rename_vehicle_code_to_internal_code_20261002_0001", _MIGRATION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest_asyncio.fixture(autouse=True)
async def _reset_trigger_state() -> AsyncIterator[None]:
    """Drop every trigger/function/index this migration touches (old AND
    new names) before each test. Prevents accumulator-style pollution
    across tests in this shared DB — same reasoning and isolation
    mechanism as `test_enforce_vehicle_code_required.py`'s own fixture.
    """
    engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            await conn.execute(
                sa.text("DROP TRIGGER IF EXISTS prosell_enforce_vehicle_code_trigger ON products")
            )
            await conn.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_vehicle_code()"))
            await conn.execute(
                sa.text("DROP TRIGGER IF EXISTS prosell_enforce_internal_code_trigger ON products")
            )
            await conn.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_internal_code()"))
            await conn.execute(
                sa.text("DROP INDEX IF EXISTS ix_products_attrs_vehicle_code_unique")
            )
            await conn.execute(
                sa.text("DROP INDEX IF EXISTS ix_products_attrs_internal_code_unique")
            )
            await conn.commit()
    finally:
        await engine.dispose()
    yield


async def _run(db_session: AsyncSession, fn: Callable[[sa.engine.Connection], None]) -> None:
    conn = await db_session.connection()
    await conn.run_sync(fn)


# The migration mutates rows via raw SQL on the same connection — the ORM
# session has no way to know about that, so a plain `select()` for an
# object already in its identity map (e.g. a product `flush()`-ed before
# running the migration) would return the STALE cached object instead of
# re-reading current DB state. `populate_existing()` forces every reload
# query below to overwrite the identity-mapped object's attributes from
# the fresh row — `AsyncSession.expire_all()` looked like the obvious
# fix but triggers a `MissingGreenlet` error outside `run_sync`'s
# greenlet context; this is the async-safe alternative.
_RELOAD = {"populate_existing": True}


async def _make_category(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    *,
    attribute_schema: dict[str, dict[str, object]],
    attribute_groups: list[dict[str, object]] | None = None,
) -> CategoryModel:
    category = CategoryModel(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        name=f"Test Cat {uuid4().hex[:6]}",
        slug=f"test-cat-{uuid4().hex[:8]}",
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema=attribute_schema,
        attribute_groups=attribute_groups or [],
    )
    db_session.add(category)
    await db_session.flush()
    return category


def _new_product(
    org: OrganizationModel,
    cat: CategoryModel,
    *,
    attributes: dict[str, object],
) -> ProductModel:
    return ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=cat.id,
        title="Rename Test Vehicle",
        price_cents=1_000_000,
        status="published",
        attributes=attributes,
    )


# ── Data rename: products.attributes ──────────────────────────────────────


@pytest.mark.asyncio
async def test_upgrade_renames_product_attributes_key_preserving_value(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    category = await _make_category(db_session, test_organization, attribute_schema={})
    product = _new_product(
        test_organization,
        category,
        attributes={"year": 2020, "vehicle_code": "4242"},
    )
    db_session.add(product)
    await db_session.flush()

    await _run(db_session, migration._do_upgrade)

    reloaded = (
        await db_session.execute(
            select(ProductModel).where(ProductModel.id == product.id).execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded.attributes["internal_code"] == "4242"
    assert "vehicle_code" not in reloaded.attributes
    assert reloaded.attributes["year"] == 2020


@pytest.mark.asyncio
async def test_upgrade_leaves_product_without_vehicle_code_untouched(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    category = await _make_category(db_session, test_organization, attribute_schema={})
    product = _new_product(test_organization, category, attributes={"color": "blue"})
    db_session.add(product)
    await db_session.flush()

    await _run(db_session, migration._do_upgrade)

    reloaded = (
        await db_session.execute(
            select(ProductModel).where(ProductModel.id == product.id).execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded.attributes == {"color": "blue"}


# ── Data rename: categories.attribute_schema + attribute_groups ───────────


@pytest.mark.asyncio
async def test_upgrade_renames_category_attribute_schema_key(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    field_def = {"type": "number", "group": "identification", "required": False}
    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"vin": {"type": "string"}, "vehicle_code": field_def},
    )

    await _run(db_session, migration._do_upgrade)

    reloaded = (
        await db_session.execute(
            select(CategoryModel)
            .where(CategoryModel.id == category.id)
            .execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded.attribute_schema["internal_code"] == field_def
    assert "vehicle_code" not in reloaded.attribute_schema
    assert reloaded.attribute_schema["vin"] == {"type": "string"}


@pytest.mark.asyncio
async def test_upgrade_renames_field_reference_in_attribute_groups(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"vehicle_code": {"type": "number"}},
        attribute_groups=[
            {"key": "identification", "fields": ["vehicle_code", "vin", "make"]},
            {"key": "other", "fields": ["color"]},
        ],
    )

    await _run(db_session, migration._do_upgrade)

    reloaded = (
        await db_session.execute(
            select(CategoryModel)
            .where(CategoryModel.id == category.id)
            .execution_options(**_RELOAD)
        )
    ).scalar_one()
    groups_by_key = {g["key"]: g["fields"] for g in reloaded.attribute_groups}
    assert groups_by_key["identification"] == ["internal_code", "vin", "make"]
    assert groups_by_key["other"] == ["color"]


# ── New trigger enforces internal_code (not vehicle_code) ─────────────────


@pytest.mark.asyncio
async def test_new_trigger_rejects_insert_missing_internal_code(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"internal_code": {"type": "number"}},
    )
    product = _new_product(test_organization, category, attributes={"year": 2020})
    db_session.add(product)

    with pytest.raises(Exception):  # noqa: B017 — see sibling migration's test for rationale
        await db_session.flush()


@pytest.mark.asyncio
async def test_new_trigger_accepts_insert_with_internal_code(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"internal_code": {"type": "number"}},
    )
    product = _new_product(test_organization, category, attributes={"internal_code": "777"})
    db_session.add(product)
    await db_session.flush()  # MUST NOT raise.

    reloaded = (
        await db_session.execute(
            select(ProductModel).where(ProductModel.id == product.id).execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded.attributes["internal_code"] == "777"


@pytest.mark.asyncio
async def test_old_vehicle_code_schema_no_longer_triggers_enforcement(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    """A category still declaring the OLD `vehicle_code` key (e.g. one the
    rename somehow missed) is no longer recognized by the NEW trigger —
    it only ever checks `internal_code`. Documents the exact boundary:
    this migration's own data-rename step is what's responsible for
    actually renaming every such row, not the trigger."""
    await _run(db_session, migration._do_upgrade)

    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"vehicle_code": {"type": "number"}},
    )
    product = _new_product(test_organization, category, attributes={"year": 2020})
    db_session.add(product)
    await db_session.flush()  # MUST NOT raise — trigger doesn't know this key anymore.


# ── Downgrade mirrors upgrade exactly ──────────────────────────────────────


@pytest.mark.asyncio
async def test_downgrade_restores_vehicle_code_key_and_enforcement(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"vehicle_code": {"type": "number"}},
        attribute_groups=[{"key": "identification", "fields": ["vehicle_code", "vin"]}],
    )
    product = _new_product(test_organization, category, attributes={"vehicle_code": "888"})
    db_session.add(product)
    await db_session.flush()

    await _run(db_session, migration._do_upgrade)
    await _run(db_session, migration._do_downgrade)

    reloaded_product = (
        await db_session.execute(
            select(ProductModel).where(ProductModel.id == product.id).execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded_product.attributes["vehicle_code"] == "888"
    assert "internal_code" not in reloaded_product.attributes

    reloaded_category = (
        await db_session.execute(
            select(CategoryModel)
            .where(CategoryModel.id == category.id)
            .execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert "vehicle_code" in reloaded_category.attribute_schema
    assert "internal_code" not in reloaded_category.attribute_schema
    groups_by_key = {g["key"]: g["fields"] for g in reloaded_category.attribute_groups}
    assert groups_by_key["identification"] == ["vehicle_code", "vin"]

    # The OLD trigger is back in force: a second product in the same
    # category with no code must be rejected again.
    rejected = _new_product(test_organization, category, attributes={"year": 2020})
    db_session.add(rejected)
    with pytest.raises(Exception):  # noqa: B017
        await db_session.flush()


@pytest.mark.asyncio
async def test_downgrade_renames_sequence_back(
    migration: Any,
    db_session: AsyncSession,
) -> None:
    await _run(db_session, migration._do_upgrade)
    await _run(db_session, migration._do_downgrade)

    result = await db_session.execute(
        text(
            "SELECT relname FROM pg_class "
            "WHERE relkind = 'S' AND relname IN "
            "('products_vehicle_code_seq', 'products_internal_code_seq')"
        )
    )
    names = {row[0] for row in result.fetchall()}
    assert names == {"products_vehicle_code_seq"}


@pytest.mark.asyncio
async def test_full_round_trip_upgrade_downgrade_upgrade(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    """A real rollback followed by a redeploy — upgrade, downgrade, then
    upgrade again — must not fail on a duplicate index/trigger/function.
    Every DDL step explicitly drops before (re)creating, in both
    directions, so this must succeed cleanly."""
    category = await _make_category(
        db_session,
        test_organization,
        attribute_schema={"vehicle_code": {"type": "number"}},
    )
    product = _new_product(test_organization, category, attributes={"vehicle_code": "321"})
    db_session.add(product)
    await db_session.flush()

    await _run(db_session, migration._do_upgrade)
    await _run(db_session, migration._do_downgrade)
    await _run(db_session, migration._do_upgrade)  # MUST NOT raise.

    reloaded = (
        await db_session.execute(
            select(ProductModel).where(ProductModel.id == product.id).execution_options(**_RELOAD)
        )
    ).scalar_one()
    assert reloaded.attributes["internal_code"] == "321"

    result = await db_session.execute(
        text(
            "SELECT relname FROM pg_class "
            "WHERE relkind = 'S' AND relname IN "
            "('products_vehicle_code_seq', 'products_internal_code_seq')"
        )
    )
    names = {row[0] for row in result.fetchall()}
    assert names == {"products_internal_code_seq"}


# ── Sequence rename ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upgrade_renames_sequence(
    migration: Any,
    db_session: AsyncSession,
) -> None:
    await _run(db_session, migration._do_upgrade)

    result = await db_session.execute(
        text(
            "SELECT relname FROM pg_class "
            "WHERE relkind = 'S' AND relname IN "
            "('products_vehicle_code_seq', 'products_internal_code_seq')"
        )
    )
    names = {row[0] for row in result.fetchall()}
    assert names == {"products_internal_code_seq"}
