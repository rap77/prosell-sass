"""
Test stubs for UserDealer entity.

This file contains test placeholders for UserDealer M:N relationship behavior.
All tests are marked as xfail until Plan 02-01 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_assign_user_to_dealer() -> None:
    """UserDealer creation assigns user to dealer with role."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_user_dealer_unique_constraint() -> None:
    """Duplicate user-dealer assignments are prevented by unique constraint."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-01")
def test_remove_user_from_dealer() -> None:
    """Removing user from dealer preserves historical audit trail."""
    pytest.fail("stub")
