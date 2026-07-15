"""Gap G1 from the T12-T18 plan: does a mid-flow failure roll back the org
+ vertical rows, or do they leak because of per-step commits?

The plan's gap doc claimed the per-request session commits after each
repository .flush(), so CreateOrganizationUseCase needs an explicit
`async with db.begin():` in the router. This test checks that claim against
the actual session lifecycle (`get_async_session` only commits once, at the
end, and only if no exception propagated -- see
infrastructure/database/session.py) before adding redundant/risky
transaction-wrapping code.
"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.use_cases.organization.create_organization import (
    CreateOrganizationUseCase,
)
from prosell.application.use_cases.organization.invite_organization_owner import (
    InviteOrganizationOwnerUseCase,
)
from prosell.domain.ports import AbstractEmailService
from prosell.infrastructure.models.category_model import CategoryModel
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_invitation_repository_impl import (
    SqlAlchemyOrganizationInvitationRepository,
)
from prosell.infrastructure.repositories.organization_repository_impl import (
    SqlAlchemyOrganizationRepository,
)
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)
from prosell.infrastructure.repositories.user_repository_impl import SqlAlchemyUserRepository


@pytest.mark.asyncio
async def test_mid_flow_failure_leaves_no_org_row_after_session_rollback(
    db_session: AsyncSession, test_organization: OrganizationModel
) -> None:
    category = CategoryModel(
        id=uuid4(),
        name="Vehicles",
        slug=f"vehicles-{uuid4().hex[:8]}",
        tenant_id=test_organization.tenant_id,
        level=0,
        parent_id=None,
        is_active=True,
        sort_order=0,
        field_config=[],
        attribute_schema={},
    )
    db_session.add(category)
    await db_session.flush()

    raising_email_service = AsyncMock(spec=AbstractEmailService)
    raising_email_service.send_org_invitation.side_effect = RuntimeError("email provider down")

    invite_use_case = InviteOrganizationOwnerUseCase(
        SqlAlchemyOrganizationInvitationRepository(db_session), raising_email_service
    )
    uc = CreateOrganizationUseCase(
        SqlAlchemyOrganizationRepository(db_session),
        SqlAlchemyOrganizationVerticalRepository(db_session),
        SqlAlchemyUserRepository(db_session),
        SqlAlchemyCategoryRepository(db_session),
        invite_use_case,
    )

    # db_session (the fixture) already wraps this whole test in an outer
    # `session.begin()`, so an explicit `db_session.rollback()` here would
    # close that outer transaction context out from under the fixture. A
    # SAVEPOINT (`begin_nested`) reproduces the same commit/rollback boundary
    # `get_async_session` gives a real request, without touching the
    # fixture's own transaction.
    with pytest.raises(RuntimeError, match="email provider down"):
        async with db_session.begin_nested():
            await uc.execute(
                name="Atomicity Test Motors",
                vertical_ids=[category.id],
                owner_email="atomicity-owner@x.com",
                inviter_name="Staff",
                created_by_user_id=uuid4(),
            )

    org_repo = SqlAlchemyOrganizationRepository(db_session)
    orgs = await org_repo.get_all(tenant_id=None)
    assert not any(o.name == "Atomicity Test Motors" for o in orgs)
