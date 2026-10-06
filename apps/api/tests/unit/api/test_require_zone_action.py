"""Unit tests for the `require_zone_action` FastAPI dependency factory
(diagnostic doc §6) — calls its inner `_check` coroutine directly, same
approach as calling any plain async function; `Depends(...)` defaults are
FastAPI wiring metadata, irrelevant when not going through a real request.
"""

from uuid import uuid4

import pytest
from fastapi import HTTPException

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User
from prosell.domain.value_objects.role_grant import RoleGrant
from prosell.infrastructure.api.dependencies import require_zone_action


class _FakeRoleRepository:
    """Minimal stand-in for `AbstractRoleRepository` — only implements
    the one method `require_zone_action` actually calls."""

    def __init__(self, roles: list[Role]) -> None:
        self._roles = roles

    async def get_user_roles_with_grants(self, user_id):  # noqa: ARG002
        return self._roles


async def _dummy_auth_dependency() -> User:
    """Never actually called — `check(...)` below is invoked directly
    with `current_user=`/`role_repository=` kwargs, bypassing FastAPI's
    own `Depends()` resolution entirely. `auth_dependency` is required
    by `require_zone_action()`'s signature regardless (bug found
    2026-10-06 — see its docstring), so a placeholder satisfies it."""
    raise NotImplementedError


def _make_user() -> User:
    return User(id=uuid4(), email="test@example.com", full_name="Test User")


def _role_with_grant(zone: str, action: str) -> Role:
    role = Role.create_system_role(RoleType.ADMIN)
    role.grants = [RoleGrant(zone=zone, action=action)]
    return role


def _role_without_grants() -> Role:
    return Role.create_system_role(RoleType.VIEWER)


class TestRequireZoneAction:
    @pytest.mark.asyncio
    async def test_allows_when_a_role_has_the_grant(self) -> None:
        user = _make_user()
        check = require_zone_action("catalog", "read", auth_dependency=_dummy_auth_dependency)

        result = await check(
            current_user=user,
            role_repository=_FakeRoleRepository([_role_with_grant("catalog", "read")]),
        )

        assert result is user

    @pytest.mark.asyncio
    async def test_blocks_when_no_role_has_the_grant(self) -> None:
        user = _make_user()
        check = require_zone_action("catalog", "read", auth_dependency=_dummy_auth_dependency)

        with pytest.raises(HTTPException) as exc_info:
            await check(
                current_user=user,
                role_repository=_FakeRoleRepository([_role_without_grants()]),
            )

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_blocks_when_user_has_no_roles_at_all(self) -> None:
        user = _make_user()
        check = require_zone_action("catalog", "read", auth_dependency=_dummy_auth_dependency)

        with pytest.raises(HTTPException) as exc_info:
            await check(current_user=user, role_repository=_FakeRoleRepository([]))

        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_allows_when_any_of_multiple_roles_has_the_grant(self) -> None:
        """Union semantics, same as the legacy has_permission() path."""
        user = _make_user()
        check = require_zone_action("catalog", "read", auth_dependency=_dummy_auth_dependency)

        result = await check(
            current_user=user,
            role_repository=_FakeRoleRepository(
                [_role_without_grants(), _role_with_grant("catalog", "read")]
            ),
        )

        assert result is user

    @pytest.mark.asyncio
    async def test_action_mismatch_in_same_zone_is_blocked(self) -> None:
        user = _make_user()
        check = require_zone_action("catalog", "delete", auth_dependency=_dummy_auth_dependency)

        with pytest.raises(HTTPException):
            await check(
                current_user=user,
                role_repository=_FakeRoleRepository([_role_with_grant("catalog", "read")]),
            )
