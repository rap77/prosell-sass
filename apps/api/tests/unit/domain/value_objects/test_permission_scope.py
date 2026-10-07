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


class TestScopeCovers:
    """`covers()` answers the anti-escalation question for ALCANCE (bloque 3,
    item 3.1): can the holder of this scope grant `other` to someone else?
    Strict-subset rule confirmed with the user — AllScope covers anything;
    ExplicitOrgsScope covers OwnScope and ExplicitOrgsScope subsets of its
    own org set, never AllScope; OwnScope covers nothing at all, not even
    another OwnScope (confirmed explicitly: an OwnScope holder cannot
    create/edit ANY profile's scope)."""

    def test_all_scope_covers_own_scope(self) -> None:
        assert AllScope().covers(OwnScope()) is True

    def test_all_scope_covers_all_scope(self) -> None:
        assert AllScope().covers(AllScope()) is True

    def test_all_scope_covers_explicit_orgs_scope(self) -> None:
        assert AllScope().covers(ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))) is True

    def test_explicit_orgs_scope_covers_own_scope(self) -> None:
        scope = ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))
        assert scope.covers(OwnScope()) is True

    def test_explicit_orgs_scope_covers_subset_of_its_own_orgs(self) -> None:
        org_a, org_b = uuid4(), uuid4()
        scope = ExplicitOrgsScope(organization_ids=frozenset({org_a, org_b}))
        assert scope.covers(ExplicitOrgsScope(organization_ids=frozenset({org_a}))) is True

    def test_explicit_orgs_scope_does_not_cover_orgs_outside_its_own_set(self) -> None:
        org_a, org_outside = uuid4(), uuid4()
        scope = ExplicitOrgsScope(organization_ids=frozenset({org_a}))
        assert (
            scope.covers(ExplicitOrgsScope(organization_ids=frozenset({org_a, org_outside})))
            is False
        )

    def test_explicit_orgs_scope_does_not_cover_all_scope(self) -> None:
        scope = ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))
        assert scope.covers(AllScope()) is False

    def test_own_scope_does_not_cover_own_scope(self) -> None:
        assert OwnScope().covers(OwnScope()) is False

    def test_own_scope_does_not_cover_explicit_orgs_scope(self) -> None:
        assert OwnScope().covers(ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))) is False

    def test_own_scope_does_not_cover_all_scope(self) -> None:
        assert OwnScope().covers(AllScope()) is False


class TestScopeProtocolConformance:
    """Every concrete scope structurally satisfies the shared `Scope`
    protocol — guards against one of the three drifting out of sync."""

    def test_own_scope_conforms(self) -> None:
        assert isinstance(OwnScope(), Scope)

    def test_all_scope_conforms(self) -> None:
        assert isinstance(AllScope(), Scope)

    def test_explicit_orgs_scope_conforms(self) -> None:
        assert isinstance(ExplicitOrgsScope(), Scope)
