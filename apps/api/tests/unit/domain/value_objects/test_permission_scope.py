"""Unit tests for the Scope specification objects (§6.4, Specification pattern).

Each concrete scope is tested only against its own `permits()` contract —
no branching logic to test, by design (that's the point of the pattern).
"""

from uuid import uuid4

from prosell.domain.value_objects.permission_scope import (
    AllScope,
    ExplicitOrgsScope,
    OwnScope,
    Scope,
)


class TestOwnScope:
    def test_permits_only_the_actors_own_organization(self) -> None:
        org = uuid4()
        other_org = uuid4()
        scope = OwnScope()

        assert scope.permits(organization_id=org, actor_organization_id=org) is True
        assert scope.permits(organization_id=other_org, actor_organization_id=org) is False


class TestAllScope:
    def test_permits_any_organization(self) -> None:
        scope = AllScope()

        assert scope.permits(organization_id=uuid4(), actor_organization_id=uuid4()) is True


class TestExplicitOrgsScope:
    def test_permits_only_listed_organizations(self) -> None:
        allowed = uuid4()
        not_allowed = uuid4()
        scope = ExplicitOrgsScope(organization_ids=frozenset({allowed}))

        assert scope.permits(organization_id=allowed, actor_organization_id=uuid4()) is True
        assert scope.permits(organization_id=not_allowed, actor_organization_id=uuid4()) is False

    def test_permits_nothing_when_list_is_empty(self) -> None:
        scope = ExplicitOrgsScope()

        assert scope.permits(organization_id=uuid4(), actor_organization_id=uuid4()) is False


class TestScopeProtocolConformance:
    """Every concrete scope structurally satisfies the shared `Scope`
    protocol — guards against one of the three drifting out of sync."""

    def test_own_scope_conforms(self) -> None:
        assert isinstance(OwnScope(), Scope)

    def test_all_scope_conforms(self) -> None:
        assert isinstance(AllScope(), Scope)

    def test_explicit_orgs_scope_conforms(self) -> None:
        assert isinstance(ExplicitOrgsScope(), Scope)
