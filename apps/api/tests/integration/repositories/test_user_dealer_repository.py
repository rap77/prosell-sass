"""
Test stubs for UserDealer repository.

This file contains test placeholders for UserDealer M:N repository behavior.
All tests are marked as xfail until Plan 02-02 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_assign_user_dealer() -> None:
    """Repository assigns user to dealer (M:N relationship)."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_get_user_dealer_ids() -> None:
    """Repository retrieves dealer IDs for user via subquery."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_remove_user_dealer() -> None:
    """Repository removes assignment while preserving audit trail."""
    pytest.fail("stub")
