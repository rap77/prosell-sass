"""Category field type value object."""

from enum import StrEnum


class FieldType(StrEnum):
    """Field type enum for dynamic category fields.

    Defines the type of form field for category-specific attributes:
    - TEXT: Single line text input
    - TEXTAREA: Multi-line text input
    - NUMBER: Numeric input (integer)
    - DECIMAL: Decimal number input (for prices, measurements)
    - SELECT: Single selection from dropdown
    - MULTISELECT: Multiple selections
    - CHECKBOX: Boolean toggle
    - DATE: Date picker
    - IMAGE: Image upload (returns URL)
    """

    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    DECIMAL = "decimal"
    SELECT = "select"
    MULTISELECT = "multiselect"
    CHECKBOX = "checkbox"
    DATE = "date"
    IMAGE = "image"

    def requires_options(self) -> bool:
        """Check if field type requires predefined options."""
        return self in (self.SELECT, self.MULTISELECT)

    def is_numeric(self) -> bool:
        """Check if field type is numeric."""
        return self in (self.NUMBER, self.DECIMAL)

    def is_text_based(self) -> bool:
        """Check if field type is text-based."""
        return self in (self.TEXT, self.TEXTAREA)

    def accepts_multiple_values(self) -> bool:
        """Check if field accepts multiple values."""
        return self == self.MULTISELECT

    def __str__(self) -> str:
        return self.value
