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
