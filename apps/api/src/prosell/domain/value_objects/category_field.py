"""Category field value object.

Defines dynamic fields for categories, allowing flexible attribute
configuration per category (e.g., vehicles have year, make, model;
electronics have specs, compatibility).
"""

from typing import cast

from prosell.domain.base import Field, ValidationInfo, ValueObject, field_validator
from prosell.domain.value_objects.field_type import FieldType

# Allowed validation_rules keys per FieldType — a FieldType missing from this
# table (SELECT/MULTISELECT/CHECKBOX/DATE/IMAGE) has no key restriction at all.
_ALLOWED_RULE_KEYS: dict[FieldType, tuple[str, ...]] = {
    FieldType.NUMBER: ("min", "max"),
    FieldType.DECIMAL: ("min", "max", "precision", "scale"),
    FieldType.TEXT: ("min_length", "max_length", "pattern"),
    FieldType.TEXTAREA: ("min_length", "max_length"),
}


class CategoryField(ValueObject):
    """Configuration for a dynamic category field.

    Used to generate forms dynamically in the frontend. Each category
    can have custom fields that products must fill.
    """

    # Field identification
    field_name: str = Field(..., min_length=1, max_length=100)
    field_label: str = Field(..., min_length=1, max_length=255)
    field_type: FieldType

    # Validation
    is_required: bool = False
    validation_rules: dict[str, object] = Field(default_factory=dict)

    # Options for SELECT/MULTISELECT
    # Format: [{"value": "red", "label": "Red"}, ...]
    options: list[dict[str, str]] = Field(default_factory=lambda: cast(list[dict[str, str]], []))

    # Organization
    field_group: str | None = None  # e.g., "specs", "dimensions", "media"
    sort_order: int = 0

    # Features
    is_searchable: bool = False  # Include in search filters
    is_filterable: bool = False  # Show as facet in marketplace
    show_in_list: bool = False  # Display in product list view

    # Help text
    placeholder: str | None = None
    help_text: str | None = None

    @field_validator("options")
    @classmethod
    def validate_options(
        cls, options: list[dict[str, str]], info: ValidationInfo
    ) -> list[dict[str, str]]:
        """Validate options exist for SELECT/MULTISELECT types."""
        field_type = info.data.get("field_type")
        if field_type in (FieldType.SELECT, FieldType.MULTISELECT) and not options:
            raise ValueError(f"{field_type} requires options")
        return options

    @field_validator("validation_rules")
    @classmethod
    def validate_validation_rules(
        cls, rules: dict[str, object], info: ValidationInfo
    ) -> dict[str, object]:
        """Validate validation rules based on field type."""
        field_type = info.data.get("field_type")
        if not isinstance(field_type, FieldType):
            return rules

        allowed_keys = _ALLOWED_RULE_KEYS.get(field_type)
        if allowed_keys is not None:
            for key in rules:
                if key not in allowed_keys:
                    raise ValueError(f"Invalid validation rule for {field_type.name}: {key}")

        return rules

    @property
    def has_options(self) -> bool:
        """Check if field has predefined options."""
        return len(self.options) > 0

    @property
    def is_numeric(self) -> bool:
        """Check if field is numeric type."""
        return self.field_type.is_numeric()

    @property
    def is_text_based(self) -> bool:
        """Check if field is text-based."""
        return self.field_type.is_text_based()
