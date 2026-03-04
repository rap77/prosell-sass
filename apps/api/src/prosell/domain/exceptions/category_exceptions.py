"""Category-related domain exceptions."""


class CategoryError(Exception):
    """Base exception for category-related errors."""

    pass


class CategoryAlreadyExistsError(CategoryError):
    """Raised when attempting to create a category with duplicate name."""

    def __init__(self, name: str) -> None:
        self.name = name
        super().__init__(f"Category with name '{name}' already exists")


class CategoryNotFoundError(CategoryError):
    """Raised when a category is not found."""

    def __init__(self, category_id: str) -> None:
        self.category_id = category_id
        super().__init__(f"Category not found: {category_id}")


class CategoryCircularReferenceError(CategoryError):
    """Raised when attempting to create a circular reference in category hierarchy."""

    def __init__(self, category_id: str, parent_id: str) -> None:
        self.category_id = category_id
        self.parent_id = parent_id
        super().__init__(
            f"Circular reference detected: category {category_id} cannot be parent of {parent_id}"
        )
