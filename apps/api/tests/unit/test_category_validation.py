"""Unit tests — Category.validate_attributes() (Phase 12, Plan 12-05).

Pure function tests — no DB, no async, no fixtures.
All edge cases of the C3 validation method.

Requirements: CTGY-01, CTGY-02, CTGY-03
"""

from uuid import uuid4

import pytest

from prosell.domain.entities.category import Category
from prosell.domain.services.facebook_vehicle_value_catalog import reconcile


def make_category(attribute_schema: dict) -> Category:
    """Helper: create Category with given schema."""
    return Category(
        id=uuid4(),
        tenant_id=uuid4(),
        name="Test Category",
        slug="test-category",
        attribute_schema=attribute_schema,
    )


# ─── Empty schema ──────────────────────────────────────────────────────────────


def test_validate_attributes_empty_schema_always_passes():
    """Empty attribute_schema skips validation (backward compat)."""
    cat = make_category({})
    cat.validate_attributes({"anything": "goes", "random": 42})
    # No exception raised


def test_validate_attributes_empty_schema_empty_attrs_passes():
    """Empty schema + empty attrs: passes."""
    cat = make_category({})
    cat.validate_attributes({})


# ─── Required fields ──────────────────────────────────────────────────────────


def test_validate_attributes_required_field_missing_raises():
    """Missing required field raises ValueError."""
    cat = make_category({"color": {"type": "string", "required": True}})
    with pytest.raises(ValueError, match="color"):
        cat.validate_attributes({})


def test_validate_attributes_required_field_present_passes():
    """Required field present: passes."""
    cat = make_category({"color": {"type": "string", "required": True}})
    cat.validate_attributes({"color": "red"})  # No exception


def test_validate_attributes_optional_field_missing_passes():
    """Optional field missing: passes (no exception)."""
    cat = make_category({"color": {"type": "string", "required": False}})
    cat.validate_attributes({})  # No exception


def test_validate_attributes_required_defaults_to_false():
    """Field without 'required' key: treated as optional."""
    cat = make_category(
        {
            "color": {"type": "string"}  # No 'required' key
        }
    )
    cat.validate_attributes({})  # No exception — required defaults to False


# ─── Type validation ──────────────────────────────────────────────────────────


def test_validate_attributes_string_type_mismatch_raises():
    """Attribute declared as string but gets number: raises ValueError."""
    cat = make_category({"color": {"type": "string", "required": True}})
    with pytest.raises(ValueError, match="color"):
        cat.validate_attributes({"color": 42})


def test_validate_attributes_number_type_accepts_int():
    """Number type accepts Python int."""
    cat = make_category({"year": {"type": "number", "required": True}})
    cat.validate_attributes({"year": 2020})  # No exception


def test_validate_attributes_number_type_accepts_float():
    """Number type accepts Python float."""
    cat = make_category({"price": {"type": "number", "required": True}})
    cat.validate_attributes({"price": 19999.99})  # No exception


def test_validate_attributes_number_type_rejects_string():
    """Number type rejects string value."""
    cat = make_category({"year": {"type": "number", "required": True}})
    with pytest.raises(ValueError, match="year"):
        cat.validate_attributes({"year": "2020"})


def test_validate_attributes_boolean_type_mismatch_raises():
    """Boolean type rejects non-boolean value."""
    cat = make_category({"certified": {"type": "boolean", "required": True}})
    with pytest.raises(ValueError, match="certified"):
        cat.validate_attributes({"certified": "yes"})


def test_validate_attributes_boolean_true_passes():
    """Boolean type accepts True."""
    cat = make_category({"certified": {"type": "boolean", "required": True}})
    cat.validate_attributes({"certified": True})  # No exception


def test_validate_attributes_boolean_false_passes():
    """Boolean type accepts False."""
    cat = make_category({"certified": {"type": "boolean", "required": True}})
    cat.validate_attributes({"certified": False})  # No exception


def test_validate_attributes_unknown_type_skips_type_check():
    """Unknown type string = type check skipped (unknown types don't block)."""
    cat = make_category({"custom": {"type": "custom_type", "required": True}})
    cat.validate_attributes({"custom": "anything"})  # No exception


# ─── Options constraint ────────────────────────────────────────────────────────


def test_validate_attributes_options_violated_raises():
    """Value not in options list raises ValueError."""
    cat = make_category(
        {
            "condition": {
                "type": "string",
                "required": True,
                "options": ["new", "used", "excellent"],
            }
        }
    )
    with pytest.raises(ValueError, match="condition"):
        cat.validate_attributes({"condition": "broken"})


def test_validate_attributes_options_valid_value_passes():
    """Value in options list passes."""
    cat = make_category(
        {
            "condition": {
                "type": "string",
                "required": True,
                "options": ["new", "used", "excellent"],
            }
        }
    )
    cat.validate_attributes({"condition": "used"})  # No exception


def test_validate_attributes_no_options_skips_options_check():
    """Field without 'options' key skips options check."""
    cat = make_category(
        {
            "color": {"type": "string", "required": True}  # No 'options'
        }
    )
    cat.validate_attributes({"color": "any_color"})  # No exception


# ─── Multiple fields ──────────────────────────────────────────────────────────


def test_validate_attributes_multiple_fields_all_valid():
    """Multiple fields, all valid: passes."""
    cat = make_category(
        {
            "color": {"type": "string", "required": True},
            "year": {"type": "number", "required": True},
            "certified": {"type": "boolean", "required": False},
        }
    )
    cat.validate_attributes(
        {
            "color": "blue",
            "year": 2022,
            "certified": False,
        }
    )


def test_validate_attributes_first_invalid_field_raises():
    """Invalid field (wrong type) raises ValueError with field name in message."""
    cat = make_category(
        {
            "year": {"type": "number", "required": True},
        }
    )
    with pytest.raises(ValueError) as exc_info:
        cat.validate_attributes({"year": "not-a-number"})
    assert "year" in str(exc_info.value)


def test_validate_attributes_error_message_includes_field_name():
    """ValueError message includes the problematic field name."""
    cat = make_category(
        {
            "color": {"type": "string", "required": True},
        }
    )
    with pytest.raises(ValueError) as exc_info:
        cat.validate_attributes({})
    assert "color" in str(exc_info.value)


# ─── u1-vehicle-catalog-api: reconciled VIN-decode value (piso #2) ──────────────


def test_validate_attributes_accepts_reconciled_vin_decode_value():
    """team-practices.md piso #2 — a value normalized by nhtsa_normalizer.py
    AND reconciled by FacebookVehicleValueCatalog (BR1.1) passes
    validate_attributes() against a schema whose `options` were configured
    with the canonical catalog's values — a fixed input/output pair, not a
    smoke test. Input: NHTSA's normalized output for a "suv" body class.
    Expected: reconcile() returns the exact canonical value "suv", and that
    value passes validation against the category's configured options.
    """
    normalized_from_vin_decode = reconcile("body_type", "suv")
    assert normalized_from_vin_decode == "suv"

    cat = make_category(
        {
            "body_type": {
                "type": "string",
                "required": True,
                "options": ["suv", "sedan", "pickup", "coupe"],
            }
        }
    )
    cat.validate_attributes({"body_type": normalized_from_vin_decode})  # No exception


def test_validate_attributes_rejects_value_reconcile_could_not_match():
    """The complementary case (BR1.2 CASE 2): a value reconcile() could NOT
    match reconciles to None, and Category.validate_attributes() rejects
    None against a required field exactly like today (no special-casing —
    FR1.3/BR1.3 says this rule doesn't change)."""
    unreconciled_value = reconcile("body_type", "not_a_real_body_type")
    assert unreconciled_value is None

    cat = make_category(
        {
            "body_type": {
                "type": "string",
                "required": True,
                "options": ["suv", "sedan", "pickup", "coupe"],
            }
        }
    )
    with pytest.raises(ValueError, match="body_type"):
        cat.validate_attributes({"body_type": unreconciled_value})
