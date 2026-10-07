"""Unit tests for CreateRoleUseCase (bloque 3, item 3.2 — write slice).

Fake in-memory repository — pure use-case logic, no DB. Covers the
composition this use case exists for: tenant_id always comes from the
trusted actor (never the request body), and both anti-escalation guards
(zone x action + scope) must fire before anything is persisted.
"""

from uuid import UUID, uuid4

import pytest

from prosell.application.dto.role.request import (
    CreateRoleRequest,
    RoleGrantRequest,
    RoleScopeRequest,
)
from prosell.application.use_cases.role.create_role import CreateRoleUseCase
from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import (
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class _FakeRoleRepository:
    """Implements only what CreateRoleUseCase actually calls; the rest
    of the Protocol is stubbed to satisfy structural typing, same as
    other fake repos in this test suite."""

    def __init__(self, *, granter_roles: list[Role]) -> None:
        self._granter_roles = granter_roles
        self.created: Role | None = None

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:  # noqa: ARG002
        return self._granter_roles

    async def create(self, role: Role) -> Role:
        self.created = role
        return role

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


def _granter_with(
    *, grants: list[RoleGrant], scope: OwnScope | AllScope | ExplicitOrgsScope | None
) -> Role:
    return Role(
        id=uuid4(),
        name="Granter Role",
        role_type=None,
        grants=grants,
        scope=scope,
    )


class TestCreateRoleUseCase:
    async def test_creates_role_with_requested_grants_and_scope(self) -> None:
        granter = _granter_with(grants=[RoleGrant(zone="catalog", action="read")], scope=AllScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = CreateRoleUseCase(repo)
        tenant_id = uuid4()

        request = CreateRoleRequest(
            name="New Profile",
            description="desc",
            grants=[RoleGrantRequest(zone="catalog", action="read")],
            scope=RoleScopeRequest(scope_type="own"),
        )

        response = await use_case.execute(
            request, tenant_id=tenant_id, granter_id=uuid4(), granter_scope=AllScope()
        )

        assert response.name == "New Profile"
        assert response.tenant_id == tenant_id
        assert repo.created is not None
        assert repo.created.has_zone_action("catalog", "read") is True
        assert isinstance(repo.created.scope, OwnScope)

    async def test_rejects_a_grant_the_granter_does_not_hold(self) -> None:
        granter = _granter_with(grants=[RoleGrant(zone="catalog", action="read")], scope=OwnScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = CreateRoleUseCase(repo)

        request = CreateRoleRequest(
            name="Escalated",
            grants=[RoleGrantRequest(zone="roles", action="delete")],
        )

        with pytest.raises(PermissionEscalationException):
            await use_case.execute(
                request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
            )
        assert repo.created is None

    async def test_rejects_a_scope_broader_than_the_granters_own(self) -> None:
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = CreateRoleUseCase(repo)

        request = CreateRoleRequest(
            name="Escalated Scope",
            scope=RoleScopeRequest(scope_type="all"),
        )

        with pytest.raises(ScopeEscalationException):
            await use_case.execute(
                request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
            )
        assert repo.created is None

    async def test_creates_role_with_no_grants_or_scope(self) -> None:
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = CreateRoleUseCase(repo)

        request = CreateRoleRequest(name="Bare")

        response = await use_case.execute(
            request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
        )

        assert response.grants == []
        assert response.scope.scope_type == "none"
