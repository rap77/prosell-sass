"""Product condition value object."""

from enum import StrEnum


class ProductCondition(StrEnum):
    """Product condition enum.

    Represents the physical condition of a product:
    - NEW: Brand new, never used
    - USED: Pre-owned, normal wear
    - REFURBISHED: Restored to working condition
    - FOR_PARTS: Not functional, sold for parts
    """

    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"
    FOR_PARTS = "for_parts"

    def is_new(self) -> bool:
        """Check if product is new."""
        return self == ProductCondition.NEW

    def is_used(self) -> bool:
        """Check if product is used or refurbished."""
        return self in (ProductCondition.USED, ProductCondition.REFURBISHED)

    def is_functional(self) -> bool:
        """Check if product is in working condition."""
        return self != ProductCondition.FOR_PARTS

    def __str__(self) -> str:
        return self.value
