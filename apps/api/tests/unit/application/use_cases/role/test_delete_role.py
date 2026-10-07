"""Unit tests for DeleteRoleUseCase (bloque 3, item 3.2 — DELETE slice)."""

from uuid import UUID, uuid4

import pytest

from prosell.application.use_cases.role.delete_role import DeleteRoleUseCase
from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import CannotDeleteSystemRoleException


class _FakeRoleRepository:
    def __init__(self) -> None:
        self.deleted_id: UUID | None = None

    async def delete(self, role_id: UUID) -> None:
        self.deleted_id = role_id

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

    async def remove_role_from_user(self, user_id: UUID, role_id: UUID) -> None:
        raise NotImplementedError

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError


class TestDeleteRoleUseCase:
    async def test_deletes_a_custom_role(self) -> None:
        repo = _FakeRoleRepository()
        use_case = DeleteRoleUseCase(repo)
        role = Role(id=uuid4(), name="Custom", role_type=None, is_system_role=False)

        await use_case.execute(role)

        assert repo.deleted_id == role.id

    async def test_rejects_deleting_a_system_role(self) -> None:
        repo = _FakeRoleRepository()
        use_case = DeleteRoleUseCase(repo)
        role = Role(id=uuid4(), name="Super Admin", role_type=None, is_system_role=True)

        with pytest.raises(CannotDeleteSystemRoleException):
            await use_case.execute(role)

        assert repo.deleted_id is None
