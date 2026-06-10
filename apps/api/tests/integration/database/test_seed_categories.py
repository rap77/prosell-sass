"""Integration — seed the global Vehículos vertical taxonomy.

Foundation Plan 2 (B2): seeds the 'Vehículos y Transporte' niche as a GLOBAL
(tenant NULL) multi-level category tree (levels 0-3). Idempotent: re-running
must not duplicate nodes.

Requires the test DB on localhost:5433.
"""

import pytest
from sqlalchemy import func, select

from prosell.infrastructure.database.seed_categories import (
    VEHICLES_VERTICAL,
    seed_vehicles_vertical,
)
from prosell.infrastructure.models.category_model import CategoryModel


def _all_slugs(node) -> list[str]:
    slugs = [node["slug"]]
    for child in node.get("children", []):
        slugs += _all_slugs(child)
    return slugs


async def _get_by_slug(db_session, slug):
    stmt = select(CategoryModel).where(
        CategoryModel.slug == slug, CategoryModel.tenant_id.is_(None)
    )
    return (await db_session.execute(stmt)).scalar_one_or_none()


@pytest.mark.asyncio
async def test_seed_creates_global_root_vertical(db_session):
    await seed_vehicles_vertical(db_session)

    root = await _get_by_slug(db_session, "vehiculos-y-transporte")
    assert root is not None
    assert root.tenant_id is None
    assert root.level == 0
    assert root.parent_id is None


@pytest.mark.asyncio
async def test_seed_creates_level_3_leaf_with_correct_hierarchy(db_session):
    await seed_vehicles_vertical(db_session)

    suvs = await _get_by_slug(db_session, "suvs")
    assert suvs is not None
    assert suvs.tenant_id is None
    assert suvs.level == 3

    # parent chain: SUVs → Carros y Camionetas (L2) → Vehículos Terrestres (L1)
    carros = await _get_by_slug(db_session, "carros-y-camionetas")
    assert carros is not None
    assert carros.level == 2
    assert suvs.parent_id == carros.id


@pytest.mark.asyncio
async def test_seed_creates_both_level_1_branches(db_session):
    await seed_vehicles_vertical(db_session)

    terrestres = await _get_by_slug(db_session, "vehiculos-terrestres")
    nautica = await _get_by_slug(db_session, "vehiculos-acuaticos-nautica")
    root = await _get_by_slug(db_session, "vehiculos-y-transporte")

    assert terrestres is not None and terrestres.level == 1
    assert nautica is not None and nautica.level == 1
    assert terrestres.parent_id == root.id
    assert nautica.parent_id == root.id


@pytest.mark.asyncio
async def test_seed_is_idempotent(db_session):
    # Count only the seed's own nodes (robust to any other global rows).
    slugs = _all_slugs(VEHICLES_VERTICAL)
    # Sanity: the Vehículos tree has 1 root + 2 L1 + 5 L2 + 17 L3 = 25 nodes
    assert len(slugs) == 25
    count_stmt = select(func.count(CategoryModel.id)).where(
        CategoryModel.tenant_id.is_(None), CategoryModel.slug.in_(slugs)
    )

    await seed_vehicles_vertical(db_session)
    first = (await db_session.execute(count_stmt)).scalar()

    await seed_vehicles_vertical(db_session)
    second = (await db_session.execute(count_stmt)).scalar()

    assert first == 25
    assert second == 25, "Re-running the seed must not duplicate categories"
