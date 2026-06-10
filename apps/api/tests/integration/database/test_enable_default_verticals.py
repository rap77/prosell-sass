"""Integration tests for enable_default_verticals (Foundation Task 7b).

A freshly-provisioned org must be linked to the global Vehicles vertical
via the organization_vertical M2M; otherwise GET /organizations/{id}/verticals
returns empty and the catalog frontend (Subsystem A) has nothing to render.
"""

from uuid import uuid4

import pytest
from sqlalchemy import select

from prosell.infrastructure.database.seed_categories import (
    VEHICLES_VERTICAL,
    enable_default_verticals,
    seed_global_taxonomy,
)
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)


async def _vehicles_root_id(db_session):
    result = await db_session.execute(
        select(CategoryModel).where(
            CategoryModel.slug == VEHICLES_VERTICAL["slug"],
            CategoryModel.tenant_id.is_(None),
            CategoryModel.parent_id.is_(None),
        )
    )
    return result.scalar_one().id


@pytest.mark.asyncio
async def test_enable_default_verticals_links_org_to_vehicles(db_session, test_organization):
    await seed_global_taxonomy(db_session)

    enabled = await enable_default_verticals(db_session, test_organization.id)

    root_id = await _vehicles_root_id(db_session)
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    ids = await repo.list_root_category_ids(test_organization.id)

    assert root_id in ids
    assert enabled == [root_id]


@pytest.mark.asyncio
async def test_enable_default_verticals_is_idempotent(db_session, test_organization):
    await seed_global_taxonomy(db_session)
    await enable_default_verticals(db_session, test_organization.id)
    await enable_default_verticals(db_session, test_organization.id)

    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    ids = await repo.list_root_category_ids(test_organization.id)

    # Only the Vehicles root is enabled by default — exactly one row, no dup.
    assert len(ids) == 1


@pytest.mark.asyncio
async def test_enable_default_verticals_is_noop_without_taxonomy(db_session, test_organization):
    # No taxonomy seeded → nothing to enable; returns empty and never crashes.
    enabled = await enable_default_verticals(db_session, test_organization.id)

    assert enabled == []
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    assert await repo.list_root_category_ids(test_organization.id) == []


@pytest.mark.asyncio
async def test_enable_default_verticals_isolates_orgs(db_session, test_organization):
    # Enabling for one org must not leak the vertical to a different org.
    await seed_global_taxonomy(db_session)
    await enable_default_verticals(db_session, test_organization.id)

    other_org_id = uuid4()
    repo = SqlAlchemyOrganizationVerticalRepository(db_session)

    assert await repo.list_root_category_ids(other_org_id) == []
