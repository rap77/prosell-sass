"""Remove a role from a user — bloque 3, item 3.4.

No anti-escalation guard: revoking a role only ever takes power away,
never grants it — same discipline already documented for
DeleteRoleUseCase.
"""

from uuid import UUID

from prosell.domain.entities.role import Role
from prosell.domain.repositories.role_repository import AbstractRoleRepository


class RemoveRoleFromUserUseCase:
    def __init__(self, role_repository: AbstractRoleRepository) -> None:
        self._role_repository = role_repository

    async def execute(self, role: Role, user_id: UUID) -> None:
        await self._role_repository.remove_role_from_user(user_id, role.id)
