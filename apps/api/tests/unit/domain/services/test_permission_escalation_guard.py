"""Unit tests for the anti-escalation guard (§6.2 / §3.1(4) of the diagnostic)."""

import pytest

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.exceptions.role_exceptions import PermissionEscalationException
from prosell.domain.services.permission_escalation_guard import ensure_no_grant_escalation
from prosell.domain.value_objects.role_grant import RoleGrant


def _granter_with_grants(*grants: RoleGrant) -> Role:
    role = Role.create_system_role(RoleType.ADMIN)
    role.grants = list(grants)
    return role


class TestEnsureNoGrantEscalation:
    def test_allows_a_subset_of_the_granters_own_grants(self) -> None:
        granter = _granter_with_grants(
            RoleGrant(zone="catalog", action="read"),
            RoleGrant(zone="catalog", action="update"),
        )

        ensure_no_grant_escalation(
            granter=granter, requested_grants=[RoleGrant(zone="catalog", action="read")]
        )  # does not raise

    def test_allows_the_exact_same_set(self) -> None:
        grants = [RoleGrant(zone="catalog", action="read")]
        granter = _granter_with_grants(*grants)

        ensure_no_grant_escalation(granter=granter, requested_grants=grants)  # does not raise

    def test_allows_an_empty_request(self) -> None:
        granter = _granter_with_grants(RoleGrant(zone="catalog", action="read"))

        ensure_no_grant_escalation(granter=granter, requested_grants=[])  # does not raise

    def test_blocks_a_grant_the_granter_does_not_hold(self) -> None:
        granter = _granter_with_grants(RoleGrant(zone="catalog", action="read"))

        with pytest.raises(PermissionEscalationException) as exc_info:
            ensure_no_grant_escalation(
                granter=granter, requested_grants=[RoleGrant(zone="leads", action="read")]
            )

        escalated = exc_info.value.details["escalated_grants"]
        assert isinstance(escalated, list)
        assert "leads:read" in escalated

    def test_blocks_only_the_escalated_pairs_when_mixed_with_valid_ones(self) -> None:
        granter = _granter_with_grants(RoleGrant(zone="catalog", action="read"))

        with pytest.raises(PermissionEscalationException) as exc_info:
            ensure_no_grant_escalation(
                granter=granter,
                requested_grants=[
                    RoleGrant(zone="catalog", action="read"),
                    RoleGrant(zone="catalog", action="delete"),
                ],
            )

        escalated = exc_info.value.details["escalated_grants"]
        assert escalated == ["catalog:delete"]

    def test_blocks_everything_when_granter_has_no_grants_at_all(self) -> None:
        granter = Role.create_system_role(RoleType.VIEWER)

        with pytest.raises(PermissionEscalationException):
            ensure_no_grant_escalation(
                granter=granter, requested_grants=[RoleGrant(zone="catalog", action="read")]
            )
