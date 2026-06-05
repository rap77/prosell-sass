"""Unit tests for the deactivate_non_vehicle_categories script (Commit 3).

The script's core is a pure async function that, given an `AsyncSession`,
deactivates (or counts in dry-run) every active category whose slug is
not "vehicles". Keeping the core in a function (instead of inline in
`__main__`) lets us test it with an in-memory SQLite or a real test DB
session.

These tests use the real test database infrastructure (the same one
integration tests use) because CategoryModel has a JSONB column that
SQLite can't represent. They will be SKIPPED in dev environments
without the test DB (localhost:5433).
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models import CategoryModel
from prosell.scripts.deactivate_non_vehicle_categories import (
    deactivate_non_vehicle_categories,
)


@pytest_asyncio.fixture
async def seed_three_categories(test_db_session: AsyncSession) -> list[CategoryModel]:
    """Seed 3 categories: 1 vehicles + 2 others, all active."""
    from prosell.infrastructure.models.organization_model import OrganizationModel
    from uuid import uuid4

    org = OrganizationModel(
        id=uuid4(),
        name=f"Test Org {uuid4().hex[:8]}",
        tenant_id=uuid4(),
        status="active",
        settings={},
    )
    test_db_session.add(org)
    await test_db_session.flush()

    vehicles = CategoryModel(
        id=uuid4(),
        tenant_id=org.id,
        name="Vehicles",
        slug="vehicles",
        level=0,
        sort_order=0,
        field_config=[],
        attribute_schema={},
        is_active=True,
    )
    boats = CategoryModel(
        id=uuid4(),
        tenant_id=org.id,
        name="Boats",
        slug="boats",
        level=0,
        sort_order=1,
        field_config=[],
        attribute_schema={},
        is_active=True,
    )
    real_estate = CategoryModel(
        id=uuid4(),
        tenant_id=org.id,
        name="Real Estate",
        slug="real-estate",
        level=0,
        sort_order=2,
        field_config=[],
        attribute_schema={},
        is_active=True,
    )
    test_db_session.add_all([vehicles, boats, real_estate])
    await test_db_session.flush()
    return [vehicles, boats, real_estate]


# ─── Dry-run does not mutate ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_dry_run_does_not_mutate(
    test_db_session: AsyncSession, seed_three_categories
) -> None:
    """With dry_run=True, no rows are updated."""
    deactivated = await deactivate_non_vehicle_categories(test_db_session, dry_run=True)

    # The 2 non-vehicles should be reported (so the operator can audit)
    assert len(deactivated) == 2
    slugs = {c.slug for c in deactivated}
    assert slugs == {"boats", "real-estate"}

    # But the DB still has all 3 active
    from sqlalchemy import select

    result = await test_db_session.execute(
        select(CategoryModel).where(
            CategoryModel.tenant_id == seed_three_categories[0].tenant_id
        )
    )
    all_active = all(c.is_active for c in result.scalars().all())
    assert all_active, "dry_run should not change is_active"


# ─── Run deactivates non-vehicles ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_run_deactivates_non_vehicles(
    test_db_session: AsyncSession, seed_three_categories
) -> None:
    """Without dry_run, vehicles stays active; boats + real-estate deactivate."""
    vehicles, boats, real_estate = seed_three_categories

    deactivated = await deactivate_non_vehicle_categories(test_db_session, dry_run=False)

    assert len(deactivated) == 2
    slugs = {c.slug for c in deactivated}
    assert slugs == {"boats", "real-estate"}

    # Re-read from DB
    await test_db_session.refresh(vehicles)
    await test_db_session.refresh(boats)
    await test_db_session.refresh(real_estate)

    assert vehicles.is_active is True, "vehicles must stay active"
    assert boats.is_active is False
    assert real_estate.is_active is False


# ─── Idempotent: re-running is a no-op ───────────────────────────────────────


@pytest.mark.asyncio
async def test_run_is_idempotent(
    test_db_session: AsyncSession, seed_three_categories: list[CategoryModel]
) -> None:
    """Running the script twice produces no errors and no second deactivation."""
    assert seed_three_categories  # fixture used for side effect (seeding the DB)
    first = await deactivate_non_vehicle_categories(test_db_session, dry_run=False)
    assert len(first) == 2

    # Second run: nothing to deactivate
    second = await deactivate_non_vehicle_categories(test_db_session, dry_run=False)
    assert len(second) == 0, "Re-run must be a no-op"
