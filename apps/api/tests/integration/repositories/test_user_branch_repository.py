"""
Test stubs for UserBranch repository.

This file contains test placeholders for UserBranch M:N repository behavior.
All tests are marked as xfail until Plan 02-02 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_assign_user_branch() -> None:
    """Repository assigns user to branch (M:N relationship)."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_get_user_branch_ids() -> None:
    """Repository retrieves branch IDs for user via subquery."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-02")
def test_remove_user_branch() -> None:
    """Repository removes assignment while preserving audit trail."""
    pytest.fail("stub")
