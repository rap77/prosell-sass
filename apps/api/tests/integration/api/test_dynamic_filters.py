"""
Test stubs for dynamic field-based filtering.

This file contains test placeholders for dynamic filter configuration.
All tests are marked as xfail until Plan 02-06 implementation.
"""

import pytest


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-06")
def test_filter_by_make_model() -> None:
    """Filter by make/model using field_config configuration."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-06")
def test_filter_price_range() -> None:
    """Filter by numeric price range (min/max)."""
    pytest.fail("stub")


@pytest.mark.xfail(reason="Not implemented yet — Plan 02-06")
def test_filter_with_invalid_field() -> None:
    """Rejects filtering by non-configured fields."""
    pytest.fail("stub")
