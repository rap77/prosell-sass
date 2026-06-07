"""Organization verticals read-API (Plan 2 / Task 4).

Mounted at ``/api/v1/organizations`` so the public URL matches the
plan/test contract: ``GET /api/v1/organizations/{organization_id}/verticals``.

This is a NEW read surface (not a replacement for the legacy
``/api/v1/org/*`` CRUD router) — the legacy router keeps its prefix to
avoid breaking existing frontend calls.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.organization.verticals import OrgVerticalsResponse
from prosell.application.use_cases.organization.list_org_verticals import (
    ListOrgVerticalsUseCase,
)
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
)
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.category_repository_impl import (
    SqlAlchemyCategoryRepository,
)
from prosell.infrastructure.repositories.organization_vertical_repository_impl import (
    SqlAlchemyOrganizationVerticalRepository,
)

router = APIRouter()


@router.get(
    "/{organization_id}/verticals",
    response_model=OrgVerticalsResponse,
    summary="List verticals (enabled global root categories) for an organization",
)
async def list_org_verticals(
    organization_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> OrgVerticalsResponse:
    """Return the verticals enabled for ``organization_id``.

    Authorization: the caller's tenant (from JWT) must match
    ``organization_id``. Tenant ID is NEVER trusted from the URL/body —
    it comes exclusively from the authenticated session (IDOR prevention).

    Each vertical is the global root category the org has opted into, plus
    its direct child categories. Each child's ``presentation`` is resolved
    via own-or-inherited from the root, and ``filter_fields`` is derived
    from its ``attribute_schema``.
    """
    if current_user.tenant_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot read another organization's verticals",
        )

    use_case = ListOrgVerticalsUseCase(
        org_vertical_repository=SqlAlchemyOrganizationVerticalRepository(db),
        category_repository=SqlAlchemyCategoryRepository(db),
    )
    return await use_case.execute(organization_id)
