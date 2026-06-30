"""Integration tests for enable_default_verticals (Foundation Task 7b).

A freshly-provisioned org must be linked to all global verticals
via the organization_vertical M2M; otherwise GET /organizations/{id}/verticals
returns empty and the catalog frontend (Subsystem A) has nothing to render.
"""

from uuid import UUID, uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.database.seed_categories import (
    ALL_VERTICALS,
    enable_default_verticals,
    seed_global_taxonomy,
)
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)


async def _root_ids(db_session: AsyncSession) -> list[UUID]:
    slugs = [v["slug"] for v in ALL_VERTICALS]
    result = await db_session.execute(
        select(CategoryModel).where(
            CategoryModel.slug.in_(slugs),
            CategoryModel.tenant_id.is_(None),
            CategoryModel.parent_id.is_(None),
        )
    )
    return [r.id for r in result.scalars().all()]


@pytest.mark.asyncio
async def test_enable_default_verticals_links_org_to_all_roots(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    await seed_global_taxonomy(db_session)

    enabled = await enable_default_verticals(db_session, test_organization.id)

    expected_ids = await _root_ids(db_session)
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    ids = await repo.list_root_category_ids(test_organization.id)

    assert set(enabled) == set(expected_ids)
    assert set(ids) == set(expected_ids)
    assert len(ids) == len(ALL_VERTICALS)


@pytest.mark.asyncio
async def test_enable_default_verticals_is_idempotent(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    await seed_global_taxonomy(db_session)
    await enable_default_verticals(db_session, test_organization.id)
    await enable_default_verticals(db_session, test_organization.id)

    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    ids = await repo.list_root_category_ids(test_organization.id)

    # All 3 roots enabled, no duplicates.
    assert len(ids) == len(ALL_VERTICALS)


@pytest.mark.asyncio
async def test_enable_default_verticals_is_noop_without_taxonomy(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    # No taxonomy seeded → nothing to enable; returns empty and never crashes.
    enabled = await enable_default_verticals(db_session, test_organization.id)

    assert enabled == []
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    assert await repo.list_root_category_ids(test_organization.id) == []


@pytest.mark.asyncio
async def test_enable_default_verticals_isolates_orgs(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    # Enabling for one org must not leak the verticals to a different org.
    await seed_global_taxonomy(db_session)
    await enable_default_verticals(db_session, test_organization.id)

    other_org_id = uuid4()
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)

    assert await repo.list_root_category_ids(other_org_id) == []
