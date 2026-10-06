"""Unit tests for the `get_effective_scope` FastAPI dependency
(diagnostic doc §6) — calls it directly as a plain async function, same
approach already used for `require_zone_action`.
"""

from uuid import UUID, uuid4

import pytest

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope
from prosell.infrastructure.api.dependencies import get_effective_scope


class _FakeRoleRepository:
    """Minimal stand-in for `AbstractRoleRepository` — implements every
    Protocol member (raising for the ones `get_effective_scope` never
    calls) so it structurally satisfies the Protocol pyright checks
    `get_effective_scope`'s real, fully-typed signature against."""

    def __init__(self, roles: list[Role]) -> None:
        self._roles = roles

    async def get_user_roles_with_grants(self, user_id: UUID) -> list[Role]:  # noqa: ARG002
        return self._roles

    async def create(self, role: Role) -> Role:
        raise NotImplementedError

    async def get_by_id(self, role_id: UUID) -> Role | None:
        raise NotImplementedError

    async def get_by_type(self, role_type: RoleType) -> Role | None:
        raise NotImplementedError

    async def list_all(self) -> list[Role]:
        raise NotImplementedError

    async def assign_role_to_user(self, user_id: UUID, role_id: UUID) -> None:
        raise NotImplementedError

    async def remove_role_from_user(self, user_id: UUID, role_id: UUID) -> None:
        raise NotImplementedError

    async def get_user_roles(self, user_id: UUID) -> list[Role]:
        raise NotImplementedError


async def _dummy_auth_dependency() -> User:
    """Never actually called — the resolved dependency below is invoked
    directly with `current_user=`/`role_repository=` kwargs, bypassing
    FastAPI's own `Depends()` resolution. `auth_dependency` is required
    by `get_effective_scope()`'s factory signature regardless (bug
    found 2026-10-06 — see its docstring), so a placeholder satisfies
    it."""
    raise NotImplementedError


def _make_user() -> User:
    return User(id=uuid4(), email="test@example.com", full_name="Test User")


def _role_with_scope(scope) -> Role:
    role = Role.create_system_role(RoleType.ADMIN)
    role.scope = scope
    return role


class TestGetEffectiveScope:
    @pytest.mark.asyncio
    async def test_defaults_to_own_scope_when_no_roles(self) -> None:
        resolve = get_effective_scope(auth_dependency=_dummy_auth_dependency)
        scope = await resolve(current_user=_make_user(), role_repository=_FakeRoleRepository([]))
        assert isinstance(scope, OwnScope)

    @pytest.mark.asyncio
    async def test_returns_all_scope_when_any_role_has_it(self) -> None:
        resolve = get_effective_scope(auth_dependency=_dummy_auth_dependency)
        scope = await resolve(
            current_user=_make_user(),
            role_repository=_FakeRoleRepository(
                [_role_with_scope(OwnScope()), _role_with_scope(AllScope())]
            ),
        )
        assert isinstance(scope, AllScope)

    @pytest.mark.asyncio
    async def test_returns_union_of_explicit_scopes(self) -> None:
        org_a, org_b = uuid4(), uuid4()
        resolve = get_effective_scope(auth_dependency=_dummy_auth_dependency)
        scope = await resolve(
            current_user=_make_user(),
            role_repository=_FakeRoleRepository(
                [
                    _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_a}))),
                    _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_b}))),
                ]
            ),
        )
        assert isinstance(scope, ExplicitOrgsScope)
        assert scope.organization_ids == {org_a, org_b}
