"""Clone an existing role (system template or custom profile) into a new
custom profile — bloque 3, item 3.3.

Grants/scope are copied from the SOURCE role, never from the request —
the request only supplies the new profile's identity (name/description).
Both anti-escalation guards still run against the source's grants/scope:
cloning a template you can't fully cover yourself is still escalation,
same discipline as CreateRoleUseCase/UpdateRoleUseCase.
"""

from uuid import UUID

from prosell.application.dto.role.request import CloneRoleRequest
from prosell.application.dto.role.response import RoleResponse
from prosell.domain.entities.role import Role
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.services.permission_escalation_guard import (
    ensure_no_grant_escalation,
    ensure_no_scope_escalation,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope


class CloneRoleUseCase:
    """Create a new custom profile by copying a source role's grants/scope.

    `tenant_id` is always the trusted, server-resolved value — never
    taken from the request, same as CreateRoleUseCase. A clone is always
    a fresh custom profile: it never inherits the source's
    `is_system_role`/`role_type` identity, only its matrix.
    """

    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(
        self,
        source: Role,
        request: CloneRoleRequest,
        *,
        tenant_id: UUID,
        granter_id: UUID,
        granter_scope: OwnScope | AllScope | ExplicitOrgsScope,
    ) -> RoleResponse:
        granter_roles = await self._role_repository.get_user_roles_with_grants(granter_id)
        union_grants_by_pair = {
            (grant.zone, grant.action): grant for role in granter_roles for grant in role.grants
        }
        granter = Role(
            id=source.id,
            name="(granter grants union)",
            role_type=None,
            grants=list(union_grants_by_pair.values()),
        )

        ensure_no_grant_escalation(granter=granter, requested_grants=source.grants)
        if source.scope is not None:
            ensure_no_scope_escalation(granter_scope=granter_scope, requested_scope=source.scope)

        role = Role.create_custom_role(
            name=request.name, description=request.description, tenant_id=tenant_id
        )
        role.grants = list(source.grants)
        role.scope = source.scope

        created = await self._role_repository.create(role)
        return RoleResponse.from_entity(created)
