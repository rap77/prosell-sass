"""
Test stubs for Dealer API endpoints.

This file contains test placeholders for Dealer CRUD endpoints.
All tests are marked as xfail until Plan 02-03 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-03")
def test_create_dealer_admin() -> None:
    """POST /api/dealers creates dealer for admin users."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-03")
def test_create_dealer_slug_unique() -> None:
    """POST /api/dealers validates slug uniqueness."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-03")
def test_get_dealer_by_id() -> None:
    """GET /api/dealers/{id} retrieves dealer by ID."""
    pytest.fail("stub")
