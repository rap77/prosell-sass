"""
Integration tests for dynamic field-based filtering.
"""

import pytest

from prosell.application.dto.vehicle.catalog import FilterParams


def test_filter_params_validation() -> None:
    """FilterParams validates all filter fields."""
    # Valid filters
    filters = FilterParams(
        make="Toyota",
        model="Corolla",
        year_min=2020,
        year_max=2023,
    )
    assert filters.make == "Toyota"
    assert filters.model == "Corolla"
    assert filters.year_min == 2020
    assert filters.year_max == 2023


def test_filter_params_range_validation() -> None:
    """FilterParams validates numeric ranges."""
    # Valid range
    filters = FilterParams(year_min=2020, year_max=2023)
    assert filters.year_min == 2020
    assert filters.year_max == 2023


def test_filter_params_invalid_range() -> None:
    """FilterParams rejects invalid ranges."""
    # year_max < year_min should raise error
    with pytest.raises(ValueError, match="year_max must be >= year_min"):
        FilterParams(year_min=2023, year_max=2020)


def test_filter_params_negative_values() -> None:
    """FilterParams rejects negative values."""
    with pytest.raises(ValueError, match="Value must be positive"):
        FilterParams(year_min=-1)


def test_filter_params_optional_fields() -> None:
    """FilterParams allows all fields to be None."""
    filters = FilterParams()
    assert filters.make is None
    assert filters.model is None
    assert filters.year_min is None
    assert filters.search is None
