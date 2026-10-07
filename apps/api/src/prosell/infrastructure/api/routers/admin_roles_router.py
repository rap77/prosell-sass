"""Admin roles (permission profiles) router — bloque 3, item 3.2.

Gated by the `roles` zone (seeded, 20261006_0002) via `require_zone_action`,
same pattern already used for `marketplace:publish` in product_router.py.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from prosell.application.dto.role.request import CreateRoleRequest, UpdateRoleRequest
from prosell.application.dto.role.response import RoleListResponse, RoleResponse
from prosell.application.use_cases.role.create_role import CreateRoleUseCase
from prosell.application.use_cases.role.delete_role import DeleteRoleUseCase
from prosell.application.use_cases.role.update_role import UpdateRoleUseCase
from prosell.domain.entities.role import Role
from prosell.domain.entities.user import User
from prosell.domain.exceptions.role_exceptions import (
    CannotDeleteSystemRoleException,
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.api.dependencies_zone_action import (
    get_effective_scope,
    get_role_repository,
    require_zone_action,
)

router = APIRouter()

get_cookie_effective_scope = get_effective_scope(auth_dependency=get_current_auth_user_from_cookie)
EffectiveScope = Annotated[
    AllScope | ExplicitOrgsScope | OwnScope, Depends(get_cookie_effective_scope)
]

require_roles_read_grant = require_zone_action(
    "roles", "read", auth_dependency=get_current_auth_user_from_cookie
)
RolesReadUser = Annotated[User, Depends(require_roles_read_grant)]

require_roles_create_grant = require_zone_action(
    "roles", "create", auth_dependency=get_current_auth_user_from_cookie
)
RolesCreateUser = Annotated[User, Depends(require_roles_create_grant)]

require_roles_update_grant = require_zone_action(
    "roles", "update", auth_dependency=get_current_auth_user_from_cookie
)
RolesUpdateUser = Annotated[User, Depends(require_roles_update_grant)]

require_roles_delete_grant = require_zone_action(
    "roles", "delete", auth_dependency=get_current_auth_user_from_cookie
)
RolesDeleteUser = Annotated[User, Depends(require_roles_delete_grant)]

RoleRepo = Annotated[AbstractRoleRepository, Depends(get_role_repository)]


def get_create_role_use_case(role_repo: RoleRepo) -> CreateRoleUseCase:
    return CreateRoleUseCase(role_repo)


def get_update_role_use_case(role_repo: RoleRepo) -> UpdateRoleUseCase:
    return UpdateRoleUseCase(role_repo)


def get_delete_role_use_case(role_repo: RoleRepo) -> DeleteRoleUseCase:
    return DeleteRoleUseCase(role_repo)


def _is_visible(
    role: Role, *, effective_scope: AllScope | ExplicitOrgsScope | OwnScope, current_user: User
) -> bool:
    """404s (not 403) for a role in a different tenant than the
    caller's own, unless the caller has AllScope — same cross-tenant
    existence-leak discipline as the rest of the app (3 real leaks
    found and fixed this project, per project.md § Deviations)."""
    return (
        isinstance(effective_scope, AllScope)
        or role.tenant_id is None
        or role.tenant_id == current_user.tenant_id
    )


@router.get(
    "",
    response_model=RoleListResponse,
    summary="List permission profiles (roles)",
)
async def list_roles(
    current_user: RolesReadUser,
    effective_scope: EffectiveScope,
    role_repo: RoleRepo,
) -> RoleListResponse:
    """
    List every system role (template) plus the caller's own tenant's
    custom profiles. An actor with AllScope sees every role across
    every tenant — mirrors the same visibility rule already used for
    org-scoped data elsewhere in the app.
    """
    tenant_id = None if isinstance(effective_scope, AllScope) else current_user.tenant_id
    roles = await role_repo.list_with_grants(tenant_id=tenant_id)
    items = [RoleResponse.from_entity(r) for r in roles]
    return RoleListResponse(items=items, total=len(items))


@router.get(
    "/{role_id}",
    response_model=RoleResponse,
    summary="Get one permission profile (role)",
)
async def get_role(
    role_id: UUID,
    current_user: RolesReadUser,
    effective_scope: EffectiveScope,
    role_repo: RoleRepo,
) -> RoleResponse:
    """404s for a role in a different tenant than the caller's own,
    unless the caller has AllScope — same cross-tenant-leak discipline
    as the rest of the app (3 real leaks found and fixed this project,
    per project.md § Deviations)."""
    role = await role_repo.get_by_id_with_grants(role_id)
    if role is None or not _is_visible(
        role, effective_scope=effective_scope, current_user=current_user
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    return RoleResponse.from_entity(role)


@router.post(
    "",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a custom permission profile (role)",
)
async def create_role(
    request: CreateRoleRequest,
    current_user: RolesCreateUser,
    effective_scope: EffectiveScope,
    use_case: Annotated[CreateRoleUseCase, Depends(get_create_role_use_case)],
) -> RoleResponse:
    """`tenant_id` always comes from `current_user`, never the request
    body (IDOR prevention). Rejects with 403 if the requested
    grants/scope exceed what the caller itself holds — nobody grants
    what they don't have (bloque 2 + item 3.1 anti-escalation guards)."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have an associated organization",
        )

    try:
        return await use_case.execute(
            request,
            tenant_id=current_user.tenant_id,
            granter_id=current_user.id,
            granter_scope=effective_scope,
        )
    except (PermissionEscalationException, ScopeEscalationException) as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a custom permission profile (role)",
)
async def delete_role(
    role_id: UUID,
    current_user: RolesDeleteUser,
    effective_scope: EffectiveScope,
    role_repo: RoleRepo,
    use_case: Annotated[DeleteRoleUseCase, Depends(get_delete_role_use_case)],
) -> None:
    """404s the same way `get_role` does; 400s instead of 403 for a
    system (template) role — that's not an authorization failure, it's
    simply not a valid target for this endpoint (DeleteRoleUseCase)."""
    existing = await role_repo.get_by_id_with_grants(role_id)
    if existing is None or not _is_visible(
        existing, effective_scope=effective_scope, current_user=current_user
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    try:
        await use_case.execute(existing)
    except CannotDeleteSystemRoleException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e


@router.patch(
    "/{role_id}",
    response_model=RoleResponse,
    summary="Update a permission profile (role)",
)
async def update_role(
    role_id: UUID,
    request: UpdateRoleRequest,
    current_user: RolesUpdateUser,
    effective_scope: EffectiveScope,
    role_repo: RoleRepo,
    use_case: Annotated[UpdateRoleUseCase, Depends(get_update_role_use_case)],
) -> RoleResponse:
    """Full replace of name/description/grants/scope. 404s the same way
    `get_role` does for a role the caller can't see; 403s if the
    requested grants/scope exceed what the caller itself holds."""
    existing = await role_repo.get_by_id_with_grants(role_id)
    if existing is None or not _is_visible(
        existing, effective_scope=effective_scope, current_user=current_user
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    try:
        return await use_case.execute(
            existing, request, granter_id=current_user.id, granter_scope=effective_scope
        )
    except (PermissionEscalationException, ScopeEscalationException) as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e)) from e
