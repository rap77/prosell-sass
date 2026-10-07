"""Create a custom permission profile (role) — bloque 3, item 3.2."""

from uuid import UUID, uuid4

from prosell.application.dto.role.request import CreateRoleRequest, RoleScopeRequest
from prosell.application.dto.role.response import RoleResponse
from prosell.domain.entities.role import Role
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.services.permission_escalation_guard import (
    ensure_no_grant_escalation,
    ensure_no_scope_escalation,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class CreateRoleUseCase:
    """Create a custom profile with an initial grants/scope matrix.

    `tenant_id` is always the trusted, server-resolved value — never
    taken from the request. Both anti-escalation guards (zone x action
    from bloque 2, alcance from item 3.1) run against the UNION of the
    granter's own roles before anything is persisted — nobody hands out
    a grant or a scope broader than what they themselves hold.
    """

    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(
        self,
        request: CreateRoleRequest,
        *,
        tenant_id: UUID,
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

        role = Role.create_custom_role(
            name=request.name, description=request.description, tenant_id=tenant_id
        )
        role.grants = requested_grants
        role.scope = requested_scope

        created = await self._role_repository.create(role)
        return RoleResponse.from_entity(created)


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
