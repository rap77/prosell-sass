"""Regression: branch.settings persists as a dict, including the empty case.

The DB column is `JSONB NOT NULL DEFAULT '{}'`, but the repository used to
write `NULL` whenever `branch.settings` was falsy (`json.dumps(...) if
branch.settings else None`). An empty dict `{}` is falsy, so creating a
branch with no settings tried to write NULL into a NOT NULL column. These
tests pin the empty-dict case (the one that broke) and a non-empty
round-trip.
"""

from datetime import datetime
from uuid import uuid4

import pytest

from prosell.domain.entities.branch import Branch
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.branch_repository_impl import (
    SqlAlchemyBranchRepository,
)


@pytest.mark.asyncio
async def test_create_branch_with_empty_settings_persists_empty_dict(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyBranchRepository(db_session)
    branch = Branch(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        name="Centro",
        slug=f"centro-{uuid4().hex[:6]}",
        settings={},
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    created = await repo.create(branch)
    fetched = await repo.get_by_id(created.id, test_organization.tenant_id)

    assert fetched is not None
    assert fetched.settings == {}


@pytest.mark.asyncio
async def test_branch_settings_roundtrip_preserves_dict(
    db_session,
    test_organization: OrganizationModel,
) -> None:
    repo = SqlAlchemyBranchRepository(db_session)
    branch = Branch(
        id=uuid4(),
        tenant_id=test_organization.tenant_id,
        name="Norte",
        slug=f"norte-{uuid4().hex[:6]}",
        settings={"theme": "dark", "max_appointments": 3},
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    created = await repo.create(branch)
    fetched = await repo.get_by_id(created.id, test_organization.tenant_id)

    assert fetched is not None
    assert fetched.settings == {"theme": "dark", "max_appointments": 3}
