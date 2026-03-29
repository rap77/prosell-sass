"""
Test stubs for Dealer repository.

This file contains test placeholders for Dealer repository behavior.
All tests are marked as xfail until Plan 02-02 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_dealer_repository_create() -> None:
    """Repository creates Dealer with generated fields."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_dealer_repository_get_by_slug() -> None:
    """Repository retrieves dealer by slug within tenant."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_dealer_repository_slug_unique() -> None:
    """Repository validates slug uniqueness per tenant."""
    pytest.fail("stub")
