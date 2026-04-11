"""Vehicle DTOs."""

from uuid import UUID

from pydantic import BaseModel, Field


class DecodeVinRequest(BaseModel):
    """DTO for VIN decode request."""

    vin: str = Field(..., min_length=17, max_length=17)


class VehicleData(BaseModel):
    """DTO for vehicle data from VIN decode."""

    year: int | None = None
    make: str | None = None
    model: str | None = None
    trim: str | None = None
    body_type: str | None = None
    drivetrain: str | None = None
    transmission: str | None = None
    engine: str | None = None
    fuel_type: str | None = None


class DecodeVinResponse(BaseModel):
    """DTO for VIN decode response."""

    vin: str
    vehicle: VehicleData
    raw_data: dict[str, str]  # Full NHTSA response
    cached: bool = False  # Whether data was from cache


class CreateVehicleRequest(BaseModel):
    """DTO for vehicle creation request."""

    product_id: UUID
    vin: str = Field(..., min_length=17, max_length=17)
    year: int | None = Field(None, ge=1900, le=2100)
    make: str | None = None
    model: str | None = None
    trim: str | None = None
    body_type: str | None = None
    drivetrain: str | None = None
    transmission: str | None = None
    engine: str | None = None
    fuel_type: str | None = None
    mileage: int | None = Field(None, ge=0)
    mileage_unit: str = Field(default="mi")
    exterior_color: str | None = None
    interior_color: str | None = None
