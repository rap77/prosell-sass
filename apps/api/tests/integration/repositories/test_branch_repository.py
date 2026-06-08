"""Regression: a branch created through the real domain path persists.

`Branch.create()` stamps `created_at`/`updated_at` as timezone-AWARE
(UTC), like the rest of the system. But the `branches` timestamp columns
were `timestamp WITHOUT time zone` (naive), so persisting a domain-created
branch raised asyncpg `DataError` ("can't subtract offset-naive and
offset-aware datetimes"). The branch API tests never caught this because
they mock the use case instead of hitting the DB. This test exercises the
real create path through the repository.
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.branch import Branch
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.branch_repository_impl import (
    SqlAlchemyBranchRepository,
)


@pytest.mark.asyncio
async def test_create_branch_from_domain_factory_persists(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyBranchRepository(db_session)
    # Branch.create() produces tz-aware timestamps — the real production path.
    branch = Branch.create(
        name=f"Sucursal {uuid4().hex[:6]}",
        tenant_id=test_organization.tenant_id,
    )

    created = await repo.create(branch)
    fetched = await repo.get_by_id(created.id, test_organization.tenant_id)

    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.created_at is not None
