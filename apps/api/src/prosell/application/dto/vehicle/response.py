"""Vehicle response DTO - BACKWARDS COMPATIBILITY LAYER.

This module provides backwards compatibility for code that still references VehicleResponse.
It wraps ProductResponse and adapts it to the old VehicleResponse interface.

DEPRECATED: Use ProductResponse instead. This will be removed in a future version.
"""

from datetime import datetime
from typing import cast
from uuid import UUID

from pydantic import BaseModel

from prosell.application.dto.product.response import ProductResponse


class VehicleResponse(BaseModel):
    """Backwards compatibility wrapper for vehicle data.

    DEPRECATED: Use ProductResponse instead.
    """

    # Legacy vehicle fields
    id: UUID
    product_id: UUID
    vin: str
    year: int
    make: str
    model: str
    trim: str | None = None
    body_type: str | None = None
    body_style: str | None = None
    drivetrain: str | None = None
    transmission: str | None = None
    engine: str | None = None
    fuel_type: str | None = None
    mileage: int | None = None
    mileage_unit: str | None = "miles"
    exterior_color: str | None = None
    interior_color: str | None = None
    has_sunroof: bool = False
    has_navigation: bool = False
    has_leather: bool = False
    has_backup_camera: bool = False
    has_bluetooth: bool = False
    has_remote_start: bool = False
    seat_material: str | None = None
    vin_verified: bool = False
    stock_number: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_product_response(cls, product: ProductResponse) -> "VehicleResponse":
        """Create VehicleResponse from ProductResponse.

        Extracts vehicle-specific attributes from the product attributes JSONB.
        """
        attrs = product.attributes or {}

        return cls(
            id=product.id,  # Use product ID as vehicle ID
            product_id=product.id,
            vin=cast(str, attrs.get("vin", "")),
            year=cast(int, attrs.get("year", 2020)),
            make=cast(str, attrs.get("make", "Unknown")),
            model=cast(str, attrs.get("model", "Unknown")),
            trim=cast(str | None, attrs.get("trim")),
            body_type=cast(str | None, attrs.get("body_type")),
            body_style=cast(str | None, attrs.get("body_style")),
            drivetrain=cast(str | None, attrs.get("drivetrain")),
            transmission=cast(str | None, attrs.get("transmission")),
            engine=cast(str | None, attrs.get("engine")),
            fuel_type=cast(str | None, attrs.get("fuel_type")),
            mileage=cast(int | None, attrs.get("mileage")),
            mileage_unit=cast(str, attrs.get("mileage_unit", "miles")),
            exterior_color=cast(str | None, attrs.get("exterior_color")),
            interior_color=cast(str | None, attrs.get("interior_color")),
            has_sunroof=cast(bool, attrs.get("has_sunroof", False)),
            has_navigation=cast(bool, attrs.get("has_navigation", False)),
            has_leather=cast(bool, attrs.get("has_leather", False)),
            has_backup_camera=cast(bool, attrs.get("has_backup_camera", False)),
            has_bluetooth=cast(bool, attrs.get("has_bluetooth", False)),
            has_remote_start=cast(bool, attrs.get("has_remote_start", False)),
            seat_material=cast(str | None, attrs.get("seat_material")),
            vin_verified=cast(bool, attrs.get("vin_verified", False)),
            stock_number=cast(str | None, attrs.get("stock_number")),
            created_at=product.created_at,
            updated_at=product.updated_at,
        )
