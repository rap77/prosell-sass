"""Unit tests for CloneRoleUseCase (bloque 3, item 3.3 — clone-template slice).

Fake in-memory repository — pure use-case logic, no DB. Covers the one
behaviour this use case adds over CreateRoleUseCase: the new profile's
grants/scope come from the SOURCE role, not the request body, while
name/description always come from the request (a clone always needs its
own identity). Both anti-escalation guards (bloque 2 + item 3.1) must
still fire against the source's grants/scope, not just request-supplied
ones — cloning a template you can't fully cover is still escalation.
"""

from uuid import UUID, uuid4

import pytest

from prosell.application.dto.role.request import CloneRoleRequest
from prosell.application.use_cases.role.clone_role import CloneRoleUseCase
from prosell.domain.entities.role import Role
from prosell.domain.exceptions.role_exceptions import (
    PermissionEscalationException,
    ScopeEscalationException,
)
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.domain.value_objects.role_grant import RoleGrant


class _FakeRoleRepository:
    """Implements only what CloneRoleUseCase actually calls; the rest of
    the Protocol is stubbed to satisfy structural typing, same convention
    as the fake repo in test_create_role.py."""

    def __init__(self, *, granter_roles: list[Role]) -> None:
        self._granter_roles = granter_roles
        self.created: Role | None = None

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:  # noqa: ARG002
        return self._granter_roles

    async def create(self, role: Role) -> Role:
        self.created = role
        return role

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

    async def delete(self, role_id: UUID) -> None:
        raise NotImplementedError


def _role_with(
    *,
    name: str = "Role",
    grants: list[RoleGrant],
    scope: OwnScope | AllScope | ExplicitOrgsScope | None,
    is_system_role: bool = False,
) -> Role:
    return Role(
        id=uuid4(),
        name=name,
        role_type=None,
        grants=grants,
        scope=scope,
        is_system_role=is_system_role,
    )


class TestCloneRoleUseCase:
    async def test_clones_source_grants_and_scope_under_the_requested_name(self) -> None:
        source = _role_with(
            name="Manager",
            grants=[RoleGrant(zone="catalog", action="read")],
            scope=OwnScope(),
            is_system_role=True,
        )
        granter = _role_with(grants=[RoleGrant(zone="catalog", action="read")], scope=AllScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = CloneRoleUseCase(repo)
        tenant_id = uuid4()

        request = CloneRoleRequest(name="Manager Global", description="Clon de Manager")

        response = await use_case.execute(
            source,
            request,
            tenant_id=tenant_id,
            granter_id=uuid4(),
            granter_scope=AllScope(),
        )

        assert response.name == "Manager Global"
        assert response.description == "Clon de Manager"
        assert response.tenant_id == tenant_id
        assert repo.created is not None
        assert repo.created.has_zone_action("catalog", "read") is True
        assert isinstance(repo.created.scope, OwnScope)
        # A clone is always a fresh custom profile — never inherits the
        # source's system-role status.
        assert repo.created.is_system_role is False

    async def test_rejects_cloning_a_grant_the_granter_does_not_hold(self) -> None:
        source = _role_with(grants=[RoleGrant(zone="roles", action="delete")], scope=OwnScope())
        granter = _role_with(grants=[RoleGrant(zone="catalog", action="read")], scope=OwnScope())
        repo = _FakeRoleRepository(granter_roles=[granter])
        use_case = CloneRoleUseCase(repo)

        request = CloneRoleRequest(name="Escalated Clone")

        with pytest.raises(PermissionEscalationException):
            await use_case.execute(
                source, request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
            )
        assert repo.created is None

    async def test_rejects_cloning_a_scope_broader_than_the_granters_own(self) -> None:
        source = _role_with(grants=[], scope=AllScope())
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = CloneRoleUseCase(repo)

        request = CloneRoleRequest(name="Escalated Scope Clone")

        with pytest.raises(ScopeEscalationException):
            await use_case.execute(
                source, request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
            )
        assert repo.created is None

    async def test_uses_the_requested_name_not_the_sources(self) -> None:
        source = _role_with(name="Source Name", grants=[], scope=None)
        repo = _FakeRoleRepository(granter_roles=[])
        use_case = CloneRoleUseCase(repo)

        request = CloneRoleRequest(name="Requested Name", description=None)

        response = await use_case.execute(
            source, request, tenant_id=uuid4(), granter_id=uuid4(), granter_scope=OwnScope()
        )

        assert response.name == "Requested Name"
