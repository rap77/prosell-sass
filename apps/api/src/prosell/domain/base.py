"""Base Pydantic models for the domain layer."""

from datetime import UTC, datetime

from pydantic import (  # noqa: F401  # type: ignore[attr-defined]
    BaseModel,
    ConfigDict,
    Field,
)


class DomainModel(BaseModel):
    """Base for all domain entities.

    Entities are MUTABLE by default - they represent business objects
    that can change state (e.g., User records login attempts, Listing updates
    price, Role gains permissions).

    Key features:
    - validate_assignment: Validates on EVERY field assignment (not just __init__)
    - from_attributes: Allows ORM models to populate via model_validate()
    - str_strip_whitespace: Auto-strips strings (UX convenience)
    - frozen=False: Entities need mutability for business methods
    """

    model_config = ConfigDict(
        frozen=False,  # Entities are mutable
        str_strip_whitespace=True,
        validate_assignment=True,  # Validates on every assignment
        from_attributes=True,  # Allows ORM integration
    )


class ValueObject(BaseModel):
    """Base for all value objects (immutable).

    Value objects represent IMMUTABLE concepts in the domain:
    - Email (validated email address)
    - Money (currency + amount)
    - VIN (vehicle identification number)
    - Percentage (0-100 range)

    Once created, they CANNOT change - this prevents bugs where code
    accidentally mutates what should be a stable value.

    Key features:
    - frozen=True: Complete immutability
    - str_strip_whitespace: Auto-strips strings
    """

    model_config = ConfigDict(
        frozen=True,  # Value objects are immutable
        str_strip_whitespace=True,
    )


class DomainEvent(BaseModel):
    """Base for all domain events (immutable).

    Domain events represent SOMETHING THAT HAPPENED in the system:
    - UserCreated
    - ListingPublished
    - PaymentProcessed
    - RolePermissionChanged

    Events are IMMUTABLE by definition - you can't change the past.

    All events automatically get:
    - timestamp: When the event occurred (UTC)
    """

    model_config = ConfigDict(frozen=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
