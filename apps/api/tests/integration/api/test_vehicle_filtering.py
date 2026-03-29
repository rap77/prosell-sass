"""
Test stubs for vehicle filtering by role.

This file contains test placeholders for role-based vehicle filtering.
All tests are marked as xfail until Plan 02-04 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-04")
def test_admin_sees_all_vehicles() -> None:
    """Admin role sees all vehicles without dealer filter."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-04")
def test_seller_sees_assigned_dealers() -> None:
    """Seller role sees vehicles from assigned dealers (IN subquery)."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-04")
def test_dealer_sees_own_inventory() -> None:
    """Dealer role sees only vehicles from their organization."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-04")
def test_unauthorized_empty_assignments() -> None:
    """Returns 401 when user has no dealer assignments."""
    pytest.fail("stub")
