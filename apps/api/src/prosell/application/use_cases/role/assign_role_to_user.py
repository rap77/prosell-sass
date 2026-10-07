"""Assign an existing role to a user — bloque 3, item 3.4.

"Nadie asigna lo que no tiene" (workbook): assigning a role hands the
target user that role's grants/scope, so both anti-escalation guards
(zone x action from bloque 2, alcance from item 3.1) run against the
ROLE BEING ASSIGNED, same composition CreateRoleUseCase/CloneRoleUseCase
already use for grants/scope coming from elsewhere than the request.
"""

from uuid import UUID

from prosell.domain.entities.role import Role
from prosell.domain.repositories.role_repository import AbstractRoleRepository
from prosell.domain.services.permission_escalation_guard import (
    ensure_no_grant_escalation,
    ensure_no_scope_escalation,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope


class AssignRoleToUserUseCase:
    """Assign `role` to `user_id`, after confirming the granter's own
    grants/scope (the UNION of their own roles) cover what `role`
    carries — nobody hands out a role whose reach exceeds their own."""

    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(
        self,
        role: Role,
        user_id: UUID,
        *,
        granter_id: UUID,
        granter_scope: OwnScope | AllScope | ExplicitOrgsScope,
    ) -> None:
        granter_roles = await self._role_repository.get_user_roles_with_grants(granter_id)
        union_grants_by_pair = {
            (grant.zone, grant.action): grant for r in granter_roles for grant in r.grants
        }
        granter = Role(
            id=role.id,
            name="(granter grants union)",
            role_type=None,
            grants=list(union_grants_by_pair.values()),
        )

        ensure_no_grant_escalation(granter=granter, requested_grants=role.grants)
        if role.scope is not None:
            ensure_no_scope_escalation(granter_scope=granter_scope, requested_scope=role.scope)

        await self._role_repository.assign_role_to_user(user_id, role.id)
