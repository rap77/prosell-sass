"""Bulk upload DTOs for vehicle CSV import."""

from __future__ import annotations

from pydantic import BaseModel, Field


class VehicleCSVRow(BaseModel):
    """DTO for a single vehicle row from CSV."""

    vin: str = Field(..., min_length=17, max_length=17)
    year: int | None = Field(None, ge=1900, le=2100)
    make: str | None = None
    model: str | None = None
    trim: str | None = None
    mileage: int | None = Field(None, ge=0)
    price_cents: int | None = Field(None, ge=0)
    condition: str | None = None  # excellent, good, fair, poor
    exterior_color: str | None = None
    interior_color: str | None = None
    transmission: str | None = None  # Automatic, Manual, CVT
    fuel_type: str | None = None  # Gas, Diesel, Electric, Hybrid
    body_style: str | None = None  # Sedan, SUV, Truck, Coupe
    drivetrain: str | None = None  # FWD, AWD, RWD, 4WD
    engine: str | None = None  # e.g., "2.5L 4-Cylinder"
    cylinders: int | None = Field(None, ge=0, le=16)
    description: str | None = None


class BulkUploadResponse(BaseModel):
    """DTO for bulk upload response."""

    total_rows: int
    created_count: int
    failed_count: int
    errors: list[BulkUploadError]


class BulkUploadError(BaseModel):
    """DTO for a single row error."""

    row_number: int
    vin: str
    error: str
    field: str | None = None
