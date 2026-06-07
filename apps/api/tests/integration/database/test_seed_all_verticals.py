"""Integration — seed the full global taxonomy (3 niches).

Foundation Plan 2 (B2 cont.): Vehículos + Bienes Raíces + Artículos, each a
GLOBAL (tenant NULL) 3-level tree. Slugs are globally unique across niches.

Requires the test DB on localhost:5433.
"""

import pytest
from sqlalchemy import func, select

from prosell.infrastructure.database.seed_categories import (
    ARTICULOS_VERTICAL,
    BIENES_RAICES_VERTICAL,
    VEHICLES_VERTICAL,
    seed_global_taxonomy,
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


def test_all_slugs_are_globally_unique_across_niches():
    """No slug collisions across the three niche trees (global uniqueness)."""
    all_slugs = (
        _all_slugs(VEHICLES_VERTICAL)
        + _all_slugs(BIENES_RAICES_VERTICAL)
        + _all_slugs(ARTICULOS_VERTICAL)
    )
    assert len(all_slugs) == len(set(all_slugs)), "Duplicate slug across niches"
    assert len(all_slugs) == 25 + 24 + 30  # 79 nodes total


@pytest.mark.asyncio
async def test_seed_global_taxonomy_creates_three_roots(db_session):
    await seed_global_taxonomy(db_session)

    for slug in ("vehiculos-y-transporte", "bienes-raices", "articulos"):
        root = await _get_by_slug(db_session, slug)
        assert root is not None, slug
        assert root.tenant_id is None
        assert root.level == 0
        assert root.parent_id is None


@pytest.mark.asyncio
async def test_bienes_raices_leaf_hierarchy(db_session):
    await seed_global_taxonomy(db_session)

    penthouse = await _get_by_slug(db_session, "penthouse")
    apartamentos = await _get_by_slug(db_session, "apartamentos")
    assert penthouse is not None
    assert penthouse.level == 3
    assert penthouse.tenant_id is None
    assert apartamentos is not None
    assert apartamentos.level == 2
    assert penthouse.parent_id == apartamentos.id


@pytest.mark.asyncio
async def test_articulos_leaf_hierarchy(db_session):
    await seed_global_taxonomy(db_session)

    smartphones = await _get_by_slug(db_session, "smartphones")
    celulares = await _get_by_slug(db_session, "celulares-y-telefonos")
    assert smartphones is not None
    assert smartphones.level == 3
    assert smartphones.tenant_id is None
    assert celulares is not None
    assert celulares.level == 2
    assert smartphones.parent_id == celulares.id


@pytest.mark.asyncio
async def test_seed_global_taxonomy_is_idempotent(db_session):
    tree_slugs = (
        _all_slugs(VEHICLES_VERTICAL)
        + _all_slugs(BIENES_RAICES_VERTICAL)
        + _all_slugs(ARTICULOS_VERTICAL)
    )
    count_stmt = select(func.count(CategoryModel.id)).where(
        CategoryModel.tenant_id.is_(None), CategoryModel.slug.in_(tree_slugs)
    )

    await seed_global_taxonomy(db_session)
    first = (await db_session.execute(count_stmt)).scalar()
    await seed_global_taxonomy(db_session)
    second = (await db_session.execute(count_stmt)).scalar()

    assert first == 79
    assert second == 79, "Re-running the global seed must not duplicate categories"
