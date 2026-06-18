"""Unit tests for build_attribute_filters — F3 wildcard-injection hardening.

Covers:
  - escape: `text` value containing `%`/`_`/`\\` does NOT inject wildcards
  - cap: text value longer than 256 chars raises ValueError
  - cap: select with 65 values raises ValueError
  - cap: range with min=-1 raises ValueError
  - cap: range with max > 1_000_000_000 raises ValueError
"""

from decimal import Decimal

import pytest

from prosell.application.use_cases.product.build_attribute_filters import (
    _escape_like_pattern,
    build_attribute_filters,
)

# ─── Cap & limit constants (must stay in lockstep with the helper) ───────────

MAX_TEXT_VALUE_LEN = 256
MAX_SELECT_VALUES = 64
MAX_SELECT_VALUE_LEN = 128
RANGE_MIN_FLOOR = 0
RANGE_MAX_CEILING = 1_000_000_000


# ─── _escape_like_pattern — pure unit coverage ────────────────────────────────


def test_escape_like_pattern_escapes_percent():
    assert _escape_like_pattern("100%") == "100\\%"


def test_escape_like_pattern_escapes_single_char_wildcard():
    assert _escape_like_pattern("a_b") == "a\\_b"


def test_escape_like_pattern_escapes_backslash_first():
    # Backslash must be escaped BEFORE %/_ so we don't double-escape.
    assert _escape_like_pattern(r"a\%b") == "a\\\\\\%b"


def test_escape_like_pattern_passes_through_safe_text():
    assert _escape_like_pattern("Toyota") == "Toyota"


# ─── text filter — escape behavior ───────────────────────────────────────────


def test_text_value_with_percent_does_not_match_extra_chars():
    """100% must match a literal value `100%` and NOT a value like `1000`.

    With unescaped `%`, ILIKE '%100%%' matches everything containing `100`.
    """
    schema = {"vin": {"type": "string", "filterable": True, "filter_type": "text"}}
    filters = build_attribute_filters({"vin": "100%"}, schema)
    assert len(filters) == 1
    # The pattern handed to ILIKE must have `%` escaped.
    assert filters[0].value == "100\\%"


def test_text_single_char_wildcard_literal_not_match():
    schema = {"vin": {"type": "string", "filterable": True, "filter_type": "text"}}
    filters = build_attribute_filters({"vin": "a_b"}, schema)
    assert filters[0].value == "a\\_b"


# ─── text filter — length cap ────────────────────────────────────────────────


def test_text_value_over_cap_raises():
    schema = {"vin": {"type": "string", "filterable": True, "filter_type": "text"}}
    overlong = "x" * (MAX_TEXT_VALUE_LEN + 1)
    with pytest.raises(ValueError, match="text"):
        build_attribute_filters({"vin": overlong}, schema)


def test_text_value_at_cap_is_accepted():
    schema = {"vin": {"type": "string", "filterable": True, "filter_type": "text"}}
    at_cap = "x" * MAX_TEXT_VALUE_LEN
    filters = build_attribute_filters({"vin": at_cap}, schema)
    assert filters[0].value == at_cap


# ─── exact filter — also goes through the escape helper ──────────────────────


def test_exact_value_with_percent_is_escaped_for_safety():
    """`exact` uses JSONB containment so escape is not strictly required for
    correctness, but the helper still runs through it for defense-in-depth."""
    schema = {"vin": {"type": "string", "filterable": True, "filter_type": "exact"}}
    filters = build_attribute_filters({"vin": "100%"}, schema)
    assert filters[0].value == "100\\%"


# ─── select filter — count cap + per-value length cap ─────────────────────────


def test_select_too_many_values_raises():
    schema = {"make": {"type": "string", "filterable": True, "filter_type": "select"}}
    too_many = ",".join(f"v{i}" for i in range(MAX_SELECT_VALUES + 1))
    with pytest.raises(ValueError, match="select"):
        build_attribute_filters({"make": too_many}, schema)


def test_select_value_too_long_raises():
    schema = {"make": {"type": "string", "filterable": True, "filter_type": "select"}}
    overlong = "x" * (MAX_SELECT_VALUE_LEN + 1)
    with pytest.raises(ValueError, match="select"):
        build_attribute_filters({"make": f"ok,{overlong}"}, schema)


def test_select_at_cap_is_accepted():
    schema = {"make": {"type": "string", "filterable": True, "filter_type": "select"}}
    at_cap = ",".join(f"v{i}" for i in range(MAX_SELECT_VALUES))
    filters = build_attribute_filters({"make": at_cap}, schema)
    assert filters[0].values is not None and len(filters[0].values) == MAX_SELECT_VALUES


# ─── range filter — magnitude cap ─────────────────────────────────────────────


def test_range_min_below_floor_raises():
    schema = {"year": {"type": "number", "filterable": True, "filter_type": "range"}}
    with pytest.raises(ValueError, match="range"):
        build_attribute_filters({"year_min": "-1"}, schema)


def test_range_min_at_floor_is_accepted():
    schema = {"year": {"type": "number", "filterable": True, "filter_type": "range"}}
    filters = build_attribute_filters({"year_min": str(RANGE_MIN_FLOOR)}, schema)
    assert filters[0].min == Decimal(RANGE_MIN_FLOOR)


def test_range_max_above_ceiling_raises():
    schema = {"year": {"type": "number", "filterable": True, "filter_type": "range"}}
    with pytest.raises(ValueError, match="range"):
        build_attribute_filters({"year_max": str(RANGE_MAX_CEILING + 1)}, schema)


def test_range_max_at_ceiling_is_accepted():
    schema = {"year": {"type": "number", "filterable": True, "filter_type": "range"}}
    filters = build_attribute_filters({"year_max": str(RANGE_MAX_CEILING)}, schema)
    assert filters[0].max == Decimal(RANGE_MAX_CEILING)
