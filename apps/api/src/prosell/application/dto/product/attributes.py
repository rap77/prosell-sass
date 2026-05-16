"""Category-specific product attributes with strict validation.

This module defines Pydantic v2 models for validating product attributes
based on category type (vehicle, real_estate, etc.).

Uses discriminated unions for type-safe runtime validation.
"""

from typing import Annotated, Literal, cast

from pydantic import BaseModel, Field, TypeAdapter

# ==================== Base Attributes ====================


class BaseProductAttributes(BaseModel):
    """Base attributes model with strict validation.

    All category-specific models inherit from this base.
    Uses strict mode to prevent type coercion.
    """

    model_config = {"strict": True, "extra": "forbid"}

    category: Literal["base"] = "base"


# ==================== Vehicle Attributes ====================


class VehicleAttributes(BaseModel):
    """Vehicle-specific product attributes.

    Validates all vehicle-related fields with proper constraints.
    Extra fields are ignored to allow flexible JSONB storage.
    """

    model_config = {"strict": True, "extra": "ignore"}

    # Discriminator field
    category: Literal["vehicle"] = "vehicle"

    # Basic vehicle info
    vin: Annotated[
        str,
        Field(
            min_length=17,
            max_length=17,
            pattern=r"^[A-HJ-NPR-Z0-9]{17}$",
            description="Vehicle Identification Number (17 characters, no I, O, Q)",
        ),
    ]
    make: Annotated[str, Field(min_length=1, max_length=100, description="Vehicle manufacturer (e.g., Toyota)")]  # noqa: E501
    model: Annotated[str, Field(min_length=1, max_length=100, description="Vehicle model (e.g., Camry)")]  # noqa: E501
    year: Annotated[int, Field(ge=1900, le=2100, description="Model year")]
    trim: Annotated[str | None, Field(max_length=100, description="Trim level (e.g., XLE, Limited)")] = None  # noqa: E501
    body_type: Annotated[
        str | None,
        Field(
            max_length=50,
            description="Body style (e.g., Sedan, SUV, Truck, Coupe)",
        ),
    ] = None

    # Drivetrain and transmission
    drivetrain: Annotated[
        str | None,
        Field(
            max_length=50,
            description="Drivetrain (e.g., FWD, RWD, AWD, 4WD)",
        ),
    ] = None
    transmission: Annotated[
        str | None,
        Field(
            max_length=50,
            description="Transmission type (e.g., Automatic, Manual, CVT)",
        ),
    ] = None

    # Engine and fuel
    engine: Annotated[
        str | None,
        Field(
            max_length=100,
            description="Engine description (e.g., 2.5L 4-Cylinder)",
        ),
    ] = None
    fuel_type: Annotated[
        str | None,
        Field(
            max_length=50,
            description="Fuel type (e.g., Gasoline, Hybrid, Electric, Diesel)",
        ),
    ] = None

    # Fuel economy (MPG)
    mpg_city: Annotated[int | None, Field(ge=0, le=150, description="City MPG")] = None
    mpg_highway: Annotated[int | None, Field(ge=0, le=150, description="Highway MPG")] = None
    mpg_combined: Annotated[int | None, Field(ge=0, le=150, description="Combined MPG")] = None

    # Mileage
    mileage: Annotated[float, Field(ge=0, description="Current mileage or odometer reading")]
    mileage_unit: Annotated[
        str,
        Field(
            default="miles",
            pattern=r"^(miles|km)$",
            description="Mileage unit: 'miles' or 'km'",
        ),
    ] = "miles"

    # Colors
    exterior_color: Annotated[
        str | None,
        Field(max_length=100, description="Exterior color"),
    ] = None
    interior_color: Annotated[
        str | None,
        Field(max_length=100, description="Interior color"),
    ] = None

    # Features (boolean flags)
    has_sunroof: Annotated[bool, Field(default=False, description="Has sunroof/moonroof")] = False
    has_navigation: Annotated[bool, Field(default=False, description="Has built-in navigation system")] = False  # noqa: E501
    has_leather: Annotated[bool, Field(default=False, description="Has leather seats")] = False
    has_backup_camera: Annotated[bool, Field(default=False, description="Has backup camera")] = False  # noqa: E501
    has_bluetooth: Annotated[bool, Field(default=False, description="Has Bluetooth connectivity")] = False  # noqa: E501
    has_remote_start: Annotated[bool, Field(default=False, description="Has remote start")] = False

    # Seat material
    seat_material: Annotated[
        str | None,
        Field(
            max_length=50,
            description="Seat material (e.g., Cloth, Leather, Vinyl)",
        ),
    ] = None

    # Branch info
    stock_number: Annotated[
        str | None,
        Field(
            max_length=100,
            description="Branch stock/inventory number",
        ),
    ] = None
    vin_verified: Annotated[bool, Field(default=False, description="VIN verified by third-party service")] = False  # noqa: E501


# ==================== Real Estate Attributes ====================


class RealEstateAttributes(BaseModel):
    """Real estate-specific product attributes.

    Validates property-related fields with proper constraints.
    Extra fields are ignored to allow flexible JSONB storage.
    """

    model_config = {"strict": True, "extra": "ignore"}

    # Discriminator field
    category: Literal["real_estate"] = "real_estate"

    # Property basics
    property_type: Annotated[
        str,
        Field(
            min_length=1,
            max_length=50,
            description="Property type (e.g., House, Apartment, Condo, Land)",
        ),
    ]
    sq_meters: Annotated[float, Field(ge=0, description="Property area in square meters")]
    rooms: Annotated[int, Field(ge=0, le=50, description="Number of rooms")]
    bathrooms: Annotated[float, Field(ge=0, le=20, description="Number of bathrooms")]
    year_built: Annotated[int | None, Field(ge=1800, le=2100, description="Year built")] = None

    # Parking
    parking_spaces: Annotated[int | None, Field(ge=0, le=20, description="Number of parking spaces")] = None  # noqa: E501

    # Features (boolean flags)
    has_pool: Annotated[bool, Field(default=False, description="Has swimming pool")] = False
    has_garden: Annotated[bool, Field(default=False, description="Has garden/yard")] = False


# ==================== Generic Product Attributes ====================


class GenericProductAttributes(BaseModel):
    """Generic product attributes for non-vehicle, non-real-estate categories.

    Used for products without specific attribute schemas.
    """

    model_config = {"strict": True, "extra": "allow"}

    # Discriminator field
    category: Literal["generic"] = "generic"


# ==================== Discriminated Union ====================


ProductAttributes = Annotated[
    VehicleAttributes | RealEstateAttributes | GenericProductAttributes,
    Field(discriminator="category"),
]

# TypeAdapter for runtime validation
# This provides a validate_python() method for dict -> model conversion
product_attributes_adapter: TypeAdapter[VehicleAttributes | RealEstateAttributes | GenericProductAttributes] = (  # noqa: E501
    TypeAdapter(ProductAttributes)
)


# ==================== Helper Functions ====================


def validate_vehicle_attributes(attributes: dict[str, object]) -> VehicleAttributes:
    """
    Validate dict as VehicleAttributes.

    Args:
        attributes: Raw attributes dict

    Returns:
        Validated VehicleAttributes model

    Raises:
        ValueError: If validation fails
    """
    # Inject discriminator if missing
    if "category" not in attributes:
        attributes = {**attributes, "category": "vehicle"}

    return cast(VehicleAttributes, product_attributes_adapter.validate_python(attributes))


def validate_real_estate_attributes(attributes: dict[str, object]) -> RealEstateAttributes:
    """
    Validate dict as RealEstateAttributes.

    Args:
        attributes: Raw attributes dict

    Returns:
        Validated RealEstateAttributes model

    Raises:
        ValueError: If validation fails
    """
    # Inject discriminator if missing
    if "category" not in attributes:
        attributes = {**attributes, "category": "real_estate"}

    return cast(RealEstateAttributes, product_attributes_adapter.validate_python(attributes))


def validate_generic_attributes(attributes: dict[str, object]) -> GenericProductAttributes:
    """
    Validate dict as GenericProductAttributes.

    Args:
        attributes: Raw attributes dict

    Returns:
        Validated GenericProductAttributes model

    Raises:
        ValueError: If validation fails
    """
    # Inject discriminator if missing
    if "category" not in attributes:
        attributes = {**attributes, "category": "generic"}

    return cast(GenericProductAttributes, product_attributes_adapter.validate_python(attributes))


# Export all models
__all__ = [
    "BaseProductAttributes",
    "GenericProductAttributes",
    "ProductAttributes",
    "RealEstateAttributes",
    "VehicleAttributes",
    "product_attributes_adapter",
    "validate_generic_attributes",
    "validate_real_estate_attributes",
    "validate_vehicle_attributes",
]
