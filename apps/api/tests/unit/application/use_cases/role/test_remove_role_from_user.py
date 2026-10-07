"""Unit tests for RemoveRoleFromUserUseCase (bloque 3, item 3.4).

No anti-escalation guard here — revoking a role only ever takes power
away, never grants it, same discipline already documented for
DeleteRoleUseCase ("borrar es revocar poder, nunca otorgarlo")."""

from uuid import UUID, uuid4

from prosell.application.use_cases.role.remove_role_from_user import RemoveRoleFromUserUseCase
from prosell.domain.entities.role import Role


class _FakeRoleRepository:
    def __init__(self) -> None:
        self.removed: tuple[UUID, UUID] | None = None

    async def remove_role_from_user(self, user_id: UUID, role_id: UUID) -> None:
        self.removed = (user_id, role_id)

    async def create(self, role: Role) -> Role:
        raise NotImplementedError

    async def update(self, role: Role) -> Role:
        raise NotImplementedError

    async def get_by_id(self, role_id: UUID) -> Role | None:
        raise NotImplementedError

    async def get_by_id_with_grants(self, role_id: UUID) -> Role | None:
        raise NotImplementedError

    async def get_by_type(self, role_type) -> Role | None:
        raise NotImplementedError

    async def list_all(self) -> list[Role]:
        raise NotImplementedError

    async def list_with_grants(self, tenant_id: UUID | None) -> list[Role]:
        raise NotImplementedError

    async def assign_role_to_user(self, user_id: UUID, role_id: UUID) -> None:
        raise NotImplementedError

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError

    async def delete(self, role_id: UUID) -> None:
        raise NotImplementedError


class TestRemoveRoleFromUserUseCase:
    async def test_removes_the_assignment(self) -> None:
        role = Role(id=uuid4(), name="Target Role", role_type=None)
        repo = _FakeRoleRepository()
        use_case = RemoveRoleFromUserUseCase(repo)
        user_id = uuid4()

        await use_case.execute(role, user_id)

        assert repo.removed == (user_id, role.id)
