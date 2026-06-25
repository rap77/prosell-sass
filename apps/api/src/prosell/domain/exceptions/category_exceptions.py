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


class SchemaMigrationRequiresForceError(CategoryError):
    """Raised when a schema change has breaking migrations that require ?force=true."""

    def __init__(self, warnings: list[str], requires_force: bool = True) -> None:
        self.warnings = warnings
        self.requires_force = requires_force
        super().__init__(f"Schema migration requires ?force=true: {'; '.join(warnings)}")


class CategoryCircularReferenceError(CategoryError):
    """Raised when attempting to create a circular reference in category hierarchy."""

    def __init__(self, category_id: str, parent_id: str) -> None:
        self.category_id = category_id
        self.parent_id = parent_id
        super().__init__(
            f"Circular reference detected: category {category_id} cannot be parent of {parent_id}"
        )
