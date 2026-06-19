from decimal import Decimal

import pytest
from pydantic import ValidationError

from prosell.domain.value_objects.attribute_filter import AttributeFilter


def test_range_requires_at_least_one_bound():
    f = AttributeFilter(key="year", filter_type="range", min=Decimal("2015"))
    assert f.min == Decimal("2015")
    with pytest.raises(ValidationError):
        AttributeFilter(key="year", filter_type="range")


def test_select_requires_non_empty_values():
    f = AttributeFilter(key="make", filter_type="select", values=["Toyota", "Honda"])
    assert f.values == ["Toyota", "Honda"]
    with pytest.raises(ValidationError):
        AttributeFilter(key="make", filter_type="select", values=[])


def test_text_and_exact_require_value():
    assert AttributeFilter(key="model", filter_type="text", value="corolla").value == "corolla"
    with pytest.raises(ValidationError):
        AttributeFilter(key="model", filter_type="text")


def test_boolean_requires_bool_value():
    assert AttributeFilter(key="is_new", filter_type="boolean", value=True).value is True
    with pytest.raises(ValidationError):
        AttributeFilter(key="is_new", filter_type="boolean", value="yes")
