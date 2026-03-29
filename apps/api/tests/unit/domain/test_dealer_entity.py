"""
Test stubs for Dealer entity.

This file contains test placeholders for Dealer entity behavior.
All tests are marked as xfail until Plan 02-01 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_dealer_create_factory() -> None:
    """Dealer.create() factory method creates valid instance with all fields."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_dealer_slug_validation() -> None:
    """Dealer slug must be unique per tenant."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_dealer_location_update() -> None:
    """Dealer location update validates lat/lng coordinates."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_dealer_timezone_default() -> None:
    """Dealer timezone defaults to America/Montevideo."""
    pytest.fail("stub")
