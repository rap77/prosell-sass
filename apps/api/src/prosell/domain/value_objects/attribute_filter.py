"""AttributeFilter value object — one catalog filter over Product.attributes."""

from decimal import Decimal
from typing import Literal

from prosell.domain.base import ValueObject, model_validator

FilterType = Literal["range", "select", "text", "boolean", "exact"]


class AttributeFilter(ValueObject):
    """A single filter applied to a product's JSONB `attributes`."""

    key: str
    filter_type: FilterType
    value: str | bool | None = None
    values: list[str] | None = None
    min: Decimal | None = None
    max: Decimal | None = None

    @model_validator(mode="after")
    def _validate_shape(self) -> "AttributeFilter":
        if self.filter_type == "range" and self.min is None and self.max is None:
            raise ValueError("range filter requires min and/or max")
        if self.filter_type == "select" and not self.values:
            raise ValueError("select filter requires non-empty values")
        if self.filter_type in ("text", "exact") and self.value is None:
            raise ValueError(f"{self.filter_type} filter requires value")
        if self.filter_type == "boolean" and not isinstance(self.value, bool):
            raise ValueError("boolean filter requires a bool value")
        return self
