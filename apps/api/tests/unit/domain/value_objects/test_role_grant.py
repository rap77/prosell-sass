"""Unit tests for the RoleGrant value object."""

import pytest
from pydantic import ValidationError

from prosell.domain.value_objects.role_grant import RoleGrant


class TestRoleGrant:
    def test_creates_with_zone_and_action(self) -> None:
        grant = RoleGrant(zone="catalog", action="read")

        assert grant.zone == "catalog"
        assert grant.action == "read"

    def test_is_immutable(self) -> None:
        grant = RoleGrant(zone="catalog", action="read")

        with pytest.raises(ValidationError):
            grant.zone = "leads"  # type: ignore[misc]

    def test_equality_by_value(self) -> None:
        assert RoleGrant(zone="catalog", action="read") == RoleGrant(zone="catalog", action="read")
        assert RoleGrant(zone="catalog", action="read") != RoleGrant(
            zone="catalog", action="update"
        )

    @pytest.mark.parametrize("zone", ["", "   "])
    def test_rejects_blank_zone(self, zone: str) -> None:
        with pytest.raises(ValidationError):
            RoleGrant(zone=zone, action="read")

    @pytest.mark.parametrize("action", ["", "   "])
    def test_rejects_blank_action(self, action: str) -> None:
        with pytest.raises(ValidationError):
            RoleGrant(zone="catalog", action=action)
