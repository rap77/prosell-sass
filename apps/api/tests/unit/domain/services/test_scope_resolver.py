"""Unit tests for resolve_effective_scope() — union across roles."""

from uuid import uuid4

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.services.scope_resolver import resolve_effective_scope
from prosell.domain.value_objects.permission_scope import AllScope, ExplicitOrgsScope, OwnScope


def _role_with_scope(scope: AllScope | ExplicitOrgsScope | OwnScope | None) -> Role:
    role = Role.create_system_role(RoleType.VIEWER)
    role.scope = scope
    return role


class TestResolveEffectiveScope:
    def test_no_roles_defaults_to_own_scope(self) -> None:
        assert isinstance(resolve_effective_scope([]), OwnScope)

    def test_single_role_with_no_scope_configured_defaults_to_own_scope(self) -> None:
        assert isinstance(resolve_effective_scope([_role_with_scope(None)]), OwnScope)

    def test_single_role_with_own_scope(self) -> None:
        assert isinstance(resolve_effective_scope([_role_with_scope(OwnScope())]), OwnScope)

    def test_single_role_with_all_scope(self) -> None:
        assert isinstance(resolve_effective_scope([_role_with_scope(AllScope())]), AllScope)

    def test_single_role_with_explicit_scope(self) -> None:
        org_id = uuid4()
        scope = resolve_effective_scope(
            [_role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_id})))]
        )
        assert isinstance(scope, ExplicitOrgsScope)
        assert scope.organization_ids == {org_id}

    def test_all_scope_wins_over_own_scope(self) -> None:
        """Most-permissive-wins, confirmed explicitly with the user
        2026-10-06 — not "primary role" or "all roles must agree."""
        scope = resolve_effective_scope(
            [_role_with_scope(OwnScope()), _role_with_scope(AllScope())]
        )
        assert isinstance(scope, AllScope)

    def test_all_scope_wins_over_explicit_scope(self) -> None:
        scope = resolve_effective_scope(
            [
                _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))),
                _role_with_scope(AllScope()),
            ]
        )
        assert isinstance(scope, AllScope)

    def test_explicit_scope_wins_over_own_scope(self) -> None:
        org_id = uuid4()
        scope = resolve_effective_scope(
            [
                _role_with_scope(OwnScope()),
                _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_id}))),
            ]
        )
        assert isinstance(scope, ExplicitOrgsScope)
        assert scope.organization_ids == {org_id}

    def test_multiple_explicit_scopes_union_their_organization_ids(self) -> None:
        org_a, org_b = uuid4(), uuid4()
        scope = resolve_effective_scope(
            [
                _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_a}))),
                _role_with_scope(ExplicitOrgsScope(organization_ids=frozenset({org_b}))),
            ]
        )
        assert isinstance(scope, ExplicitOrgsScope)
        assert scope.organization_ids == {org_a, org_b}

    def test_mixed_none_and_own_scope_roles_default_to_own_scope(self) -> None:
        scope = resolve_effective_scope([_role_with_scope(None), _role_with_scope(OwnScope())])
        assert isinstance(scope, OwnScope)
