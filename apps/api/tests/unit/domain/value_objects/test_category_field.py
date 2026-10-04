"""Characterization tests for CategoryField.validate_validation_rules —
backend decomposition Stage 2.4. Zero test coverage existed for this
validator before this change (confirmed by direct search). Pins current
behavior per FieldType before collapsing the 4 near-identical loops into one
shared lookup table.
"""

import pytest
from pydantic import ValidationError

from prosell.domain.value_objects.category_field import CategoryField
from prosell.domain.value_objects.field_type import FieldType


def _make_field(field_type: FieldType, validation_rules: dict[str, object]) -> CategoryField:
    options = (
        [{"value": "a", "label": "A"}]
        if field_type in (FieldType.SELECT, FieldType.MULTISELECT)
        else []
    )
    return CategoryField(
        field_name="test_field",
        field_label="Test Field",
        field_type=field_type,
        validation_rules=validation_rules,
        options=options,
    )


class TestNumberFieldType:
    @pytest.mark.parametrize("rules", [{}, {"min": 0}, {"max": 100}, {"min": 0, "max": 100}])
    def test_allowed_keys_pass(self, rules):
        field = _make_field(FieldType.NUMBER, rules)
        assert field.validation_rules == rules

    @pytest.mark.parametrize("rules", [{"pattern": "x"}, {"min_length": 1}, {"precision": 2}])
    def test_disallowed_key_raises(self, rules):
        with pytest.raises(ValidationError, match="Invalid validation rule for NUMBER"):
            _make_field(FieldType.NUMBER, rules)


class TestDecimalFieldType:
    @pytest.mark.parametrize(
        "rules",
        [{}, {"min": 0}, {"max": 100}, {"precision": 2}, {"scale": 2}],
    )
    def test_allowed_keys_pass(self, rules):
        field = _make_field(FieldType.DECIMAL, rules)
        assert field.validation_rules == rules

    @pytest.mark.parametrize("rules", [{"pattern": "x"}, {"min_length": 1}])
    def test_disallowed_key_raises(self, rules):
        with pytest.raises(ValidationError, match="Invalid validation rule for DECIMAL"):
            _make_field(FieldType.DECIMAL, rules)


class TestTextFieldType:
    @pytest.mark.parametrize(
        "rules",
        [{}, {"min_length": 1}, {"max_length": 100}, {"pattern": "^[a-z]+$"}],
    )
    def test_allowed_keys_pass(self, rules):
        field = _make_field(FieldType.TEXT, rules)
        assert field.validation_rules == rules

    @pytest.mark.parametrize("rules", [{"min": 0}, {"precision": 2}, {"scale": 2}])
    def test_disallowed_key_raises(self, rules):
        with pytest.raises(ValidationError, match="Invalid validation rule for TEXT"):
            _make_field(FieldType.TEXT, rules)


class TestTextareaFieldType:
    @pytest.mark.parametrize("rules", [{}, {"min_length": 1}, {"max_length": 500}])
    def test_allowed_keys_pass(self, rules):
        field = _make_field(FieldType.TEXTAREA, rules)
        assert field.validation_rules == rules

    @pytest.mark.parametrize("rules", [{"pattern": "x"}, {"min": 0}])
    def test_disallowed_key_raises(self, rules):
        with pytest.raises(ValidationError, match="Invalid validation rule for TEXTAREA"):
            _make_field(FieldType.TEXTAREA, rules)


class TestUnvalidatedFieldTypes:
    """SELECT/MULTISELECT/CHECKBOX/DATE/IMAGE have no elif branch at all —
    ANY validation_rules dict passes through untouched, no matter its keys.
    Pinning this explicitly: it's easy to assume every FieldType is covered
    when only 4 of them actually are."""

    @pytest.mark.parametrize(
        "field_type", [FieldType.SELECT, FieldType.MULTISELECT, FieldType.CHECKBOX]
    )
    def test_any_rules_pass_unvalidated(self, field_type):
        rules = {"anything": "goes", "min": 0, "pattern": "x"}
        field = _make_field(field_type, rules)
        assert field.validation_rules == rules


class TestOtherFieldTypes:
    def test_select_requires_options(self):
        with pytest.raises(ValidationError, match="requires options"):
            CategoryField(
                field_name="color",
                field_label="Color",
                field_type=FieldType.SELECT,
                options=[],
            )
