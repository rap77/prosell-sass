"""Integration tests for the enforce-vehicle_code-required migration.

The migration enforces a DB invariant: a product whose category's
``attribute_schema`` declares ``vehicle_code`` MUST carry a non-empty
``attributes->>'vehicle_code'`` on INSERT and UPDATE. A BEFORE-trigger
raises when the value is NULL or the empty string. Categories that do
NOT declare ``vehicle_code`` in their schema are untouched — the
constraint is vehicle-only.

The migration also runs a one-shot data backfill that populates
``vehicle_code`` on every existing vehicle-category product that
already lacked one, so the new trigger doesn't reject legacy rows the
moment it is installed.

Mirrors the migration-test pattern from
``test_migrate_legacy_vehicle_catalog.py`` (importlib load + sync
``_do_upgrade``/``_do_downgrade`` entry points driven via
``conn.run_sync(fn)``). The new migration module is expected to live
at ``alembic/versions/20260929_0001_enforce_vehicle_code_required.py``
and to expose ``_do_upgrade(connection)``/``_do_downgrade(connection)``
sync entry points for testing isolation from Alembic's own upgrade()
wrapper.
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
    / "20260929_0001_enforce_vehicle_code_required.py"
)


@pytest.fixture(scope="module")
def migration() -> Any:
    spec = importlib.util.spec_from_file_location(
        "enforce_vehicle_code_required_20260929_0001", _MIGRATION_PATH
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest_asyncio.fixture(autouse=True)
async def _reset_trigger_state() -> AsyncIterator[None]:
    """Drop any leftover trigger/function from a previous test in this
    shared DB. Prevents accumulator-style pollution across runs.

    Uses a fresh engine with ``NullPool`` and commits its own transaction
    so the drops run outside the ``db_session`` transaction context —
    running them through ``db_session`` itself would terminate the
    ``session.begin()`` transaction the conftest fixture is holding,
    breaking every subsequent ORM call in the test.
    """
    engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            await conn.execute(
                sa.text("DROP TRIGGER IF EXISTS prosell_enforce_vehicle_code_trigger ON products")
            )
            await conn.execute(sa.text("DROP FUNCTION IF EXISTS prosell_enforce_vehicle_code()"))
            await conn.commit()
    finally:
        await engine.dispose()
    yield


async def _run(db_session: AsyncSession, fn: Callable[[sa.engine.Connection], None]) -> None:
    conn = await db_session.connection()
    await conn.run_sync(fn)


async def _make_category(
    db_session: AsyncSession,
    test_organization: OrganizationModel,
    *,
    declares_vehicle_code: bool,
) -> CategoryModel:
    """A category whose ``attribute_schema`` either declares
    ``vehicle_code`` (the trigger must fire) or does not (the trigger
    must NOT fire). The fixture category from conftest has an empty
    schema, so we build our own for the trigger-positive cases.
    """
    attribute_schema: dict[str, dict[str, object]] = (
        {"vehicle_code": {"type": "string", "required": True}} if declares_vehicle_code else {}
    )
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
    )
    db_session.add(category)
    await db_session.flush()
    return category


def _new_product(
    org: OrganizationModel,
    cat: CategoryModel,
    *,
    attributes: dict[str, object],
    status: str = "published",
) -> ProductModel:
    return ProductModel(
        id=uuid4(),
        tenant_id=org.tenant_id,
        organization_id=org.id,
        category_id=cat.id,
        title="Trigger Test Vehicle",
        price_cents=1_000_000,
        status=status,
        attributes=attributes,
    )


async def _count_rows_missing_vehicle_code(
    db_session: AsyncSession, *, vehicle_category_id: Any
) -> int:
    """Count products in this category whose ``attributes->>'vehicle_code'``
    is NULL or the empty string. The backfill step must drive this to 0
    for the test to pass.
    """
    result = await db_session.execute(
        text(
            """
            SELECT COUNT(*) FROM products
            WHERE category_id = :cat_id
              AND (
                    attributes->>'vehicle_code' IS NULL
                 OR attributes->>'vehicle_code' = ''
              )
            """
        ),
        {"cat_id": vehicle_category_id},
    )
    row = result.scalar_one()
    return int(row)


# ── (a) INSERT without vehicle_code in a vehicle category MUST raise ──────


@pytest.mark.asyncio
async def test_insert_without_vehicle_code_in_vehicle_category_raises(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=True
    )
    product = _new_product(
        test_organization,
        vehicle_category,
        attributes={"year": 2020, "make": "Ford", "model": "Explorer"},
    )
    db_session.add(product)

    # The trigger must reject this insert. We catch broadly (Exception)
    # because the actual exception class — `IntegrityError`,
    # `asyncpg.exceptions.RaiseException`, `NotNullViolation`, or a
    # custom domain exception — depends on the migration's SQL shape and
    # we want the test to remain green against any valid implementation.
    with pytest.raises(Exception):  # noqa: B017
        await db_session.flush()


# ── (b) INSERT with vehicle_code in a vehicle category succeeds ──────────


@pytest.mark.asyncio
async def test_insert_with_vehicle_code_in_vehicle_category_succeeds(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=True
    )
    product = _new_product(
        test_organization,
        vehicle_category,
        attributes={
            "year": 2021,
            "make": "Honda",
            "model": "Civic",
            "vehicle_code": "1234",
        },
    )
    db_session.add(product)
    await db_session.flush()  # MUST NOT raise.

    reloaded = (
        await db_session.execute(select(ProductModel).where(ProductModel.id == product.id))
    ).scalar_one()
    assert reloaded.attributes["vehicle_code"] == "1234"


# ── (c) INSERT without vehicle_code in a non-vehicle category succeeds ────


@pytest.mark.asyncio
async def test_insert_without_vehicle_code_in_non_vehicle_category_succeeds(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    non_vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=False
    )
    product = _new_product(
        test_organization,
        non_vehicle_category,
        attributes={"color": "blue", "size": "M"},
    )
    db_session.add(product)
    await db_session.flush()  # MUST NOT raise.

    reloaded = (
        await db_session.execute(select(ProductModel).where(ProductModel.id == product.id))
    ).scalar_one()
    assert "vehicle_code" not in (reloaded.attributes or {})


# ── (d) UPDATE that clears vehicle_code in a vehicle category MUST raise ──


@pytest.mark.asyncio
async def test_update_clearing_vehicle_code_in_vehicle_category_raises(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    await _run(db_session, migration._do_upgrade)

    vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=True
    )
    product = _new_product(
        test_organization,
        vehicle_category,
        attributes={"vehicle_code": "9999"},
    )
    db_session.add(product)
    await db_session.flush()

    # Attempt to clear vehicle_code — UPDATE-path coverage.
    product.attributes = {"year": 2020}
    with pytest.raises(Exception):  # noqa: B017
        await db_session.flush()


# ── (e) downgrade() reverts — the trigger is gone ─────────────────────────


@pytest.mark.asyncio
async def test_downgrade_removes_trigger_and_prior_rejections_now_succeed(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    """After downgrade(), the four cases above revert. The previously-
    rejecting insert (case a) now succeeds because the trigger is gone;
    the previously-OK cases (b, c) remain OK as a regression guard.
    """
    vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=True
    )
    non_vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=False
    )

    # Pre-seed two products while the trigger is OFF (haven't run upgrade
    # yet) so the test can exercise the post-downgrade INSERT paths
    # against a real driver.
    other = _new_product(
        test_organization,
        vehicle_category,
        attributes={"vehicle_code": "1111"},
    )
    db_session.add(other)
    await db_session.flush()

    await _run(db_session, migration._do_upgrade)

    # Trigger is now ON. The pre-existing `other` row remains readable;
    # new inserts without vehicle_code must fail (case a — confirms
    # the trigger was installed by upgrade()).
    #
    # Wrap the bad insert in a SAVEPOINT (``begin_nested()``) so the
    # trigger failure aborts only the savepoint, not the outer
    # transaction. Without the SAVEPOINT, the failed flush would
    # deactivate the whole transaction (SQLAlchemy 2.0's
    # ``_restore_snapshot`` auto-expunges pending objects on flush
    # failure, which would break the subsequent raw-SQL downgrade
    # call AND the post-downgrade INSERTs).
    async with db_session.begin_nested():
        pre_downgrade = _new_product(
            test_organization,
            vehicle_category,
            attributes={"year": 2020},
        )
        db_session.add(pre_downgrade)
        with pytest.raises(Exception):  # noqa: B017
            await db_session.flush()

    await _run(db_session, migration._do_downgrade)

    # Case (a) inverted: insert without vehicle_code into the SAME
    # vehicle category now succeeds because the trigger is gone.
    after_downgrade = _new_product(
        test_organization,
        vehicle_category,
        attributes={"year": 2022},
    )
    db_session.add(after_downgrade)
    await db_session.flush()  # MUST NOT raise.

    # Case (b) regression: insert WITH vehicle_code still succeeds.
    with_code = _new_product(
        test_organization,
        vehicle_category,
        attributes={"vehicle_code": "2222"},
    )
    db_session.add(with_code)
    await db_session.flush()

    # Case (c) regression: insert without vehicle_code into a
    # non-vehicle category still succeeds.
    non_vehicle = _new_product(
        test_organization,
        non_vehicle_category,
        attributes={"color": "red"},
    )
    db_session.add(non_vehicle)
    await db_session.flush()

    # Case (d) inverted: UPDATE that clears vehicle_code now succeeds.
    with_code.attributes = {"vehicle_code": "", "note": "cleared after downgrade"}
    await db_session.flush()  # MUST NOT raise.


# ── (f) Backfill — legacy rows get vehicle_code populated by upgrade() ─────


@pytest.mark.asyncio
async def test_upgrade_backfills_vehicle_code_on_existing_vehicle_rows(
    migration: Any,
    db_session: AsyncSession,
    test_organization: OrganizationModel,
) -> None:
    """Pre-existing vehicle-category products without vehicle_code MUST
    be populated by the data-migration step inside upgrade() — the new
    trigger would otherwise reject them the instant it is installed.
    The count of rows where ``attributes->>'vehicle_code' IS NULL OR = ''``
    in a vehicle category must be ZERO after upgrade().
    """
    vehicle_category = await _make_category(
        db_session, test_organization, declares_vehicle_code=True
    )

    # Seed two legacy rows that lack vehicle_code BEFORE running the
    # migration — this is the exact shape the backfill must repair.
    legacy_a = _new_product(
        test_organization,
        vehicle_category,
        attributes={"year": 2019, "make": "Toyota"},
    )
    legacy_b = _new_product(
        test_organization,
        vehicle_category,
        attributes={"year": 2020, "make": "Mazda"},
    )
    db_session.add_all([legacy_a, legacy_b])
    await db_session.flush()

    # Sanity precondition: rows really do lack vehicle_code before
    # upgrade(). If the backfill has no work to do, the test is
    # silently passing for the wrong reason.
    pre_count = await _count_rows_missing_vehicle_code(
        db_session, vehicle_category_id=vehicle_category.id
    )
    assert pre_count == 2

    await _run(db_session, migration._do_upgrade)

    post_count = await _count_rows_missing_vehicle_code(
        db_session, vehicle_category_id=vehicle_category.id
    )
    assert post_count == 0
