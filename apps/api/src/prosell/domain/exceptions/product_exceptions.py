"""Product-related domain exceptions."""


class ProductError(Exception):
    """Base exception for product-related errors."""

    pass


class ProductNotFoundError(ProductError):
    """Raised when a product is not found."""

    def __init__(self, product_id: str) -> None:
        self.product_id = product_id
        super().__init__(f"Product not found: {product_id}")


class ProductAlreadyExistsError(ProductError):
    """Raised when attempting to create a duplicate product."""

    def __init__(self, title: str) -> None:
        self.title = title
        super().__init__(f"Product with title '{title}' already exists")


class ProductInvalidStatusTransitionError(ProductError):
    """Raised when attempting an invalid status transition."""

    def __init__(self, current_status: str, new_status: str) -> None:
        self.current_status = current_status
        self.new_status = new_status
        super().__init__(f"Cannot transition from {current_status} to {new_status}")


class ProductNotEditableError(ProductError):
    """Raised when attempting to edit a non-editable product."""

    def __init__(self, status: str) -> None:
        self.status = status
        super().__init__(f"Product with status '{status}' cannot be edited")


class VehicleAlreadyExistsError(ProductError):
    """Raised when attempting to create a vehicle for a product that already has one."""

    def __init__(self, product_id: str) -> None:
        self.product_id = product_id
        super().__init__(f"Product already has a vehicle: {product_id}")


class InvalidVINError(ProductError):
    """Raised when VIN is invalid."""

    def __init__(self, vin: str, reason: str = "Invalid format") -> None:
        self.vin = vin
        self.reason = reason
        super().__init__(f"Invalid VIN '{vin}': {reason}")


class ProductVersionConflictError(ProductError):
    """Raised when repo.update() sees an entity fetched at a stale version.

    Optimistic locking: the caller must re-fetch and retry rather than
    silently overwrite a concurrent change. Maps to HTTP 412 Precondition
    Failed at the API layer.
    """

    def __init__(self, product_id: str, expected_version: int, actual_version: int) -> None:
        self.product_id = product_id
        self.expected_version = expected_version
        self.actual_version = actual_version
        super().__init__(
            f"Product {product_id} was modified concurrently: expected version "
            f"{expected_version}, found {actual_version}"
        )


class ProductRestoreTargetMissingError(ProductError):
    """Raised when restoring an ARCHIVED product with no archived_from_status.

    Products archived before the reverse-transitions feature shipped have no
    restore target recorded and require manual admin fixup rather than a
    silent fallback to DRAFT.
    """

    def __init__(self, product_id: str) -> None:
        self.product_id = product_id
        super().__init__(
            f"Product {product_id} has no archived_from_status recorded; "
            f"cannot restore automatically"
        )
