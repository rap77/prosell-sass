"""Regression: the user_branches repository runs real queries on `branch_id`.

The `rename_dealers_to_branches` migration renamed the table but left the
FK column as `dealer_id`, while the ORM declares `branch_id`. No test ever
exercised this repository against the DB, so the mismatch shipped as a
latent runtime bug: any real assign/lookup raised
`ProgrammingError: column "branch_id" does not exist`. These tests close
that gap by hitting the database through the repository.
"""

from datetime import datetime
from uuid import uuid4

import pytest

from prosell.infrastructure.models.branch_model import BranchModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.user_model import UserModel
from prosell.infrastructure.repositories.user_branch_repository_impl import (
    SqlAlchemyUserBranchRepository,
)


async def _make_branch(db_session, tenant_id) -> BranchModel:
    branch = BranchModel(
        id=uuid4(),
        tenant_id=tenant_id,
        name=f"Sucursal {uuid4().hex[:6]}",
        slug=f"sucursal-{uuid4().hex[:6]}",
        settings={},
        timezone="America/Montevideo",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    db_session.add(branch)
    await db_session.flush()
    return branch


@pytest.mark.asyncio
async def test_assign_persists_and_returns_branch_id(
    db_session,
    test_organization: OrganizationModel,
    test_user: UserModel,
) -> None:
    branch = await _make_branch(db_session, test_organization.tenant_id)
    repo = SqlAlchemyUserBranchRepository(db_session)

    assignment = await repo.assign(
        user_id=test_user.id,
        branch_id=branch.id,
        tenant_id=test_organization.tenant_id,
    )

    assert assignment.branch_id == branch.id
    assert assignment.user_id == test_user.id


@pytest.mark.asyncio
async def test_get_user_branch_ids_returns_assigned_branch(
    db_session,
    test_organization: OrganizationModel,
    test_user: UserModel,
) -> None:
    branch = await _make_branch(db_session, test_organization.tenant_id)
    repo = SqlAlchemyUserBranchRepository(db_session)
    await repo.assign(
        user_id=test_user.id,
        branch_id=branch.id,
        tenant_id=test_organization.tenant_id,
    )

    branch_ids = await repo.get_user_branch_ids(test_user.id, test_organization.tenant_id)

    assert branch.id in branch_ids
