"""Delete a custom permission profile (role) — bloque 3, item 3.2."""

from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import CannotDeleteSystemRoleException
from prosell.domain.repositories.role_repository import AbstractRoleRepository


class DeleteRoleUseCase:
    """System (template) roles can never be deleted through this path —
    only a custom profile can. No anti-escalation check applies here:
    deleting is revoking power, never granting it."""

    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(self, role: Role) -> None:
        if role.is_system_role:
            raise CannotDeleteSystemRoleException(role.name)
        await self._role_repository.delete(role.id)
