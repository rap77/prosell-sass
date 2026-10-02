"""Internal-code parsing regressions for client CSV imports."""

import pytest

from prosell.domain.services.csv_field_mapper import CSVFieldMapper


@pytest.mark.parametrize("value", ["-42", "+42", "0"])
def test_parse_optional_int_rejects_non_positive_or_signed_internal_codes(value: str) -> None:
    """Client CSV ids are unsigned positive decimal internal codes only."""
    assert CSVFieldMapper._parse_optional_int(value) is None
