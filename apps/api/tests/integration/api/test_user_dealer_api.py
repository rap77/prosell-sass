"""
Test stubs for User-Dealer assignment API endpoints.

This file contains test placeholders for user-dealer M:N management endpoints.
All tests are marked as xfail until Plan 02-07 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-07")
def test_assign_seller_to_dealer() -> None:
    """POST /api/users/{id}/dealers assigns seller to dealer."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-07")
def test_bulk_assign_sellers() -> None:
    """POST /api/users/bulk-assign assigns multiple sellers to dealers."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-07")
def test_remove_seller_from_dealer() -> None:
    """DELETE /api/users/{id}/dealers/{dealer_id} removes assignment."""
    pytest.fail("stub")
