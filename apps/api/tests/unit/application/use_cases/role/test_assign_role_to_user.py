"""Unit tests for AssignRoleToUserUseCase (bloque 3, item 3.4).

Fake in-memory repository — pure use-case logic, no DB. "Nadie asigna lo
que no tiene" (workbook, item 3.4): assigning a role to a user hands that
user the role's grants/scope, so both anti-escalation guards (bloque 2 +
item 3.1) must fire against the ROLE being assigned, same composition
already used by CreateRoleUseCase/CloneRoleUseCase.
"""

from uuid import UUID, uuid4

import pytest

from prosell.application.use_cases.role.assign_role_to_user import AssignRoleToUserUseCase
from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import (
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class _FakeRoleRepository:
    """Implements only what AssignRoleToUserUseCase actually calls; the
    rest of the Protocol is stubbed, same convention as the other fake
    repos in this test suite."""

    def __init__(self, *, granter_roles: list[Role]) -> None:
        self._granter_roles = granter_roles
        self.assigned: tuple[UUID, UUID] | None = None

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:  # noqa: ARG002
        return self._granter_roles

    async def assign_role_to_user(self, user_id: UUID, role_id: UUID) -> None:
        self.assigned = (user_id, role_id)

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

    async def remove_role_from_user(self, user_id: UUID, role_id: UUID) -> None:
        raise NotImplementedError

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError

    async def delete(self, role_id: UUID) -> None:
        raise NotImplementedError


def _role_with(
    *, grants: list[RoleGrant], scope: OwnScope | AllScope | ExplicitOrgsScope | None
) -> Role:
    return Role(id=uuid4(), name="Target Role", role_type=None, grants=grants, scope=scope)


class TestAssignRoleToUserUseCase:
    async def test_assigns_when_granter_covers_the_roles_grants_and_scope(self) -> None:
        role = _role_with(grants=[RoleGrant(zone="catalog", action="read")], scope=OwnScope())
        granter = _role_with(grants=[RoleGrant(zone="catalog", action="read")], scope=AllScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = AssignRoleToUserUseCase(repo)
        user_id = uuid4()

        await use_case.execute(role, user_id, granter_id=uuid4(), granter_scope=AllScope())

        assert repo.assigned == (user_id, role.id)

    async def test_rejects_assigning_a_role_whose_grants_the_granter_does_not_hold(self) -> None:
        role = _role_with(grants=[RoleGrant(zone="roles", action="delete")], scope=OwnScope())
        granter = _role_with(grants=[RoleGrant(zone="catalog", action="read")], scope=OwnScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = AssignRoleToUserUseCase(repo)

        with pytest.raises(PermissionEscalationException):
            await use_case.execute(role, uuid4(), granter_id=uuid4(), granter_scope=OwnScope())
        assert repo.assigned is None

    async def test_rejects_assigning_a_role_whose_scope_the_granter_does_not_cover(self) -> None:
        role = _role_with(grants=[], scope=AllScope())
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = AssignRoleToUserUseCase(repo)

        with pytest.raises(ScopeEscalationException):
            await use_case.execute(role, uuid4(), granter_id=uuid4(), granter_scope=OwnScope())
        assert repo.assigned is None
