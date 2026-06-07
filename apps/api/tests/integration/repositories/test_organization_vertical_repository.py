"""Integration tests for OrganizationVerticalRepository (Plan 2 §3.4).

The organization_vertical table is the M2M bridge that lets an org opt
into N global verticals (root categories with tenant_id=NULL). The
repository is the only writer — idempotent enable via
`pg_insert ... on_conflict_do_nothing` and a simple list-by-org read.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)


@pytest.mark.asyncio
async def test_enable_and_list_verticals(db_session, test_organization):
    cat_repo = SqlAlchemyCategoryRepository(db_session)
    vehicles = await cat_repo.create(
        Category.create(name="Vehicles", slug=f"veh-{uuid4().hex[:6]}", tenant_id=None, level=0)
    )
    realestate = await cat_repo.create(
        Category.create(name="Real Estate", slug=f"re-{uuid4().hex[:6]}", tenant_id=None, level=0)
    )

    repo = SqlAlchemyOrganizationVerticalRepository(db_session)
    await repo.enable(test_organization.id, vehicles.id)
    await repo.enable(test_organization.id, realestate.id)

    ids = await repo.list_root_category_ids(test_organization.id)
    assert vehicles.id in ids and realestate.id in ids
