"""Unit tests for UpdateRoleUseCase (bloque 3, item 3.2 — PATCH slice).

Fake in-memory repository, same conventions as test_create_role.py.
"""

from uuid import UUID, uuid4

import pytest

from prosell.application.dto.role.request import (
    RoleGrantRequest,
    RoleScopeRequest,
    UpdateRoleRequest,
)
from prosell.application.use_cases.role.update_role import UpdateRoleUseCase
from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import (
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.value_objects.permission_scope import AllScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class _FakeRoleRepository:
    def __init__(self, *, granter_roles: list[Role]) -> None:
        self._granter_roles = granter_roles
        self.updated: Role | None = None

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:  # noqa: ARG002
        return self._granter_roles

    async def update(self, role: Role) -> Role:
        self.updated = role
        return role

    async def create(self, role: Role) -> Role:
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

    async def delete(self, role_id: UUID) -> None:
        raise NotImplementedError


def _existing_role(*, tenant_id: UUID) -> Role:
    return Role(
        id=uuid4(),
        name="Original Name",
        description="Original",
        role_type=None,
        is_system_role=False,
        tenant_id=tenant_id,
        grants=[RoleGrant(zone="catalog", action="read")],
        scope=OwnScope(),
    )


def _granter_with(*, grants: list[RoleGrant]) -> Role:
    return Role(id=uuid4(), name="Granter", role_type=None, grants=grants)


class TestUpdateRoleUseCase:
    async def test_replaces_name_description_grants_and_scope(self) -> None:
        existing = _existing_role(tenant_id=uuid4())
        granter = _granter_with(grants=[RoleGrant(zone="catalog", action="update")])
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = UpdateRoleUseCase(repo)

        request = UpdateRoleRequest(
            name="Updated Name",
            description="Updated",
            grants=[RoleGrantRequest(zone="catalog", action="update")],
            scope=RoleScopeRequest(scope_type="all"),
        )

        response = await use_case.execute(
            existing, request, granter_id=uuid4(), granter_scope=AllScope()
        )

        assert response.name == "Updated Name"
        assert repo.updated is not None
        assert repo.updated.id == existing.id
        assert repo.updated.has_zone_action("catalog", "update") is True
        assert repo.updated.has_zone_action("catalog", "read") is False
        assert isinstance(repo.updated.scope, AllScope)

    async def test_preserves_identity_fields(self) -> None:
        tenant_id = uuid4()
        existing = _existing_role(tenant_id=tenant_id)
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = UpdateRoleUseCase(repo)

        request = UpdateRoleRequest(name="New Name")

        await use_case.execute(existing, request, granter_id=uuid4(), granter_scope=OwnScope())

        assert repo.updated is not None
        assert repo.updated.id == existing.id
        assert repo.updated.tenant_id == tenant_id
        assert repo.updated.is_system_role is False

    async def test_rejects_a_grant_the_granter_does_not_hold(self) -> None:
        existing = _existing_role(tenant_id=uuid4())
        granter = _granter_with(grants=[RoleGrant(zone="catalog", action="read")])
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = UpdateRoleUseCase(repo)

        request = UpdateRoleRequest(
            name="Escalated", grants=[RoleGrantRequest(zone="roles", action="delete")]
        )

        with pytest.raises(PermissionEscalationException):
            await use_case.execute(existing, request, granter_id=uuid4(), granter_scope=OwnScope())
        assert repo.updated is None

    async def test_rejects_a_scope_broader_than_the_granters_own(self) -> None:
        existing = _existing_role(tenant_id=uuid4())
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = UpdateRoleUseCase(repo)

        request = UpdateRoleRequest(
            name="Escalated Scope", scope=RoleScopeRequest(scope_type="all")
        )

        with pytest.raises(ScopeEscalationException):
            await use_case.execute(existing, request, granter_id=uuid4(), granter_scope=OwnScope())
        assert repo.updated is None
