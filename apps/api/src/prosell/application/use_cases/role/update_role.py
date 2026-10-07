"""Update a custom permission profile (role) — bloque 3, item 3.2."""

from uuid import UUID, uuid4

from prosell.application.dto.role.request import RoleScopeRequest, UpdateRoleRequest
from prosell.application.dto.role.response import RoleResponse
from prosell.domain.entities.role import Role
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.services.permission_escalation_guard import (
    ensure_no_grant_escalation,
    ensure_no_scope_escalation,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class UpdateRoleUseCase:
    """Full replace of a role's editable fields (name, description,
    grants, scope) — identity fields (`id`, `tenant_id`, `role_type`,
    `is_system_role`) are preserved from `existing`, never taken from
    the request. Same double anti-escalation composition as
    `CreateRoleUseCase`, run against the UNION of the granter's own
    roles before anything is persisted."""

    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(
        self,
        existing: Role,
        request: UpdateRoleRequest,
        *,
        granter_id: UUID,
        granter_scope: OwnScope | AllScope | ExplicitOrgsScope,
    ) -> RoleResponse:
        requested_grants = [RoleGrant(zone=g.zone, action=g.action) for g in request.grants]
        requested_scope = _to_domain_scope(request.scope)

        granter_roles = await self._role_repository.get_user_roles_with_grants(granter_id)
        union_grants_by_pair = {
            (grant.zone, grant.action): grant for role in granter_roles for grant in role.grants
        }
        granter = Role(
            id=uuid4(),
            name="(granter grants union)",
            role_type=None,
            grants=list(union_grants_by_pair.values()),
        )

        ensure_no_grant_escalation(granter=granter, requested_grants=requested_grants)
        if requested_scope is not None:
            ensure_no_scope_escalation(granter_scope=granter_scope, requested_scope=requested_scope)

        existing.name = request.name
        existing.description = request.description
        existing.grants = requested_grants
        existing.scope = requested_scope

        updated = await self._role_repository.update(existing)
        return RoleResponse.from_entity(updated)


def _to_domain_scope(
    scope_request: RoleScopeRequest | None,
) -> OwnScope | AllScope | ExplicitOrgsScope | None:
    if scope_request is None:
        return None
    if scope_request.scope_type == "own":
        return OwnScope()
    if scope_request.scope_type == "all":
        return AllScope()
    return ExplicitOrgsScope(organization_ids=frozenset(scope_request.organization_ids))
