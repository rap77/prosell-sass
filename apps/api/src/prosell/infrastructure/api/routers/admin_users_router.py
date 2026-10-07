"""Admin users router — bloque 3, item 3.6.

Minimal exact-email lookup for the admin profiles UI's "assign user"
panel: no listing/search endpoint exists yet for users, and building one
(pagination, partial-match search) was deliberately deferred — the
user's explicit choice when this gap surfaced mid-implementation. Gated
by the `users` zone (already seeded, 20261006_0002), same
`require_zone_action` pattern as every other admin router.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.user import UserSummaryResponse
from prosell.domain.entities.user import User
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_user_repository,
)
from prosell.infrastructure.api.dependencies_zone_action import (
    get_effective_scope,
    require_zone_action,
)

router = APIRouter()

get_cookie_effective_scope = get_effective_scope(auth_dependency=get_current_auth_user_from_cookie)
EffectiveScope = Annotated[
    AllScope | ExplicitOrgsScope | OwnScope, Depends(get_cookie_effective_scope)
]

require_users_read_grant = require_zone_action(
    "users", "read", auth_dependency=get_current_auth_user_from_cookie
)
UsersReadUser = Annotated[User, Depends(require_users_read_grant)]

UserRepo = Annotated[AbstractUserRepository, Depends(get_user_repository)]


def _is_visible(
    target_user: User,
    *,
    effective_scope: AllScope | ExplicitOrgsScope | OwnScope,
    current_user: User,
) -> bool:
    """Same cross-tenant existence-leak discipline as `admin_roles_router.py`'s
    `_is_user_visible()` — 404s (not 403) a match outside the caller's own
    tenant unless they hold AllScope."""
    return isinstance(effective_scope, AllScope) or target_user.tenant_id == current_user.tenant_id


@router.get(
    "/by-email",
    response_model=UserSummaryResponse,
    summary="Find a user by exact email (admin profiles UI's assign-user lookup)",
)
async def get_user_by_email(
    email: str,
    current_user: UsersReadUser,
    effective_scope: EffectiveScope,
    user_repo: UserRepo,
) -> UserSummaryResponse:
    target_user = await user_repo.get_by_email(email)
    if target_user is None or not _is_visible(
        target_user, effective_scope=effective_scope, current_user=current_user
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return UserSummaryResponse(
        id=target_user.id,
        email=target_user.email,
        full_name=target_user.full_name,
        tenant_id=target_user.tenant_id,
    )
