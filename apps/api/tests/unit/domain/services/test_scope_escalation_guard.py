"""Unit tests for the scope anti-escalation guard (bloque 3, item 3.1).

Companion to `test_permission_escalation_guard.py` (zone x action) — this
one covers ALCANCE, deliberately left unresolved by that guard (see its
own module docstring). Subset rule confirmed with the user: a granter can
only hand out a scope that is <= its own.
"""

import pytest

from prosell.domain.exceptions.role_exceptions import ScopeEscalationException
from prosell.domain.services.permission_escalation_guard import ensure_no_scope_escalation
from prosell.domain.value_objects.permission_scope import (
    AllScope,
    ExplicitOrgsScope,
    OwnScope,
)


class TestEnsureNoScopeEscalation:
    def test_allows_all_scope_granter_to_grant_any_scope(self) -> None:
        ensure_no_scope_escalation(granter_scope=AllScope(), requested_scope=OwnScope())
        ensure_no_scope_escalation(granter_scope=AllScope(), requested_scope=AllScope())
        ensure_no_scope_escalation(
            granter_scope=AllScope(),
            requested_scope=ExplicitOrgsScope(),
        )  # none of these raise

    def test_allows_explicit_orgs_granter_to_grant_a_subset(self) -> None:
        from uuid import uuid4

        org = uuid4()
        granter_scope = ExplicitOrgsScope(organization_ids=frozenset({org}))

        ensure_no_scope_escalation(
            granter_scope=granter_scope,
            requested_scope=ExplicitOrgsScope(organization_ids=frozenset({org})),
        )  # does not raise

    def test_blocks_explicit_orgs_granter_from_granting_all_scope(self) -> None:
        from uuid import uuid4

        granter_scope = ExplicitOrgsScope(organization_ids=frozenset({uuid4()}))

        with pytest.raises(ScopeEscalationException):
            ensure_no_scope_escalation(granter_scope=granter_scope, requested_scope=AllScope())

    def test_blocks_own_scope_granter_from_granting_anything(self) -> None:
        with pytest.raises(ScopeEscalationException):
            ensure_no_scope_escalation(granter_scope=OwnScope(), requested_scope=OwnScope())

    def test_exception_message_mentions_both_scopes(self) -> None:
        with pytest.raises(ScopeEscalationException) as exc_info:
            ensure_no_scope_escalation(granter_scope=OwnScope(), requested_scope=AllScope())

        assert "OwnScope" in str(exc_info.value)
        assert "AllScope" in str(exc_info.value)
