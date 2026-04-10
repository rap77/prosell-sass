"""Vehicle response DTO."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.vehicle import Vehicle


class VehicleResponse(BaseModel):
    """DTO for vehicle API responses — fully typed, replaces raw dict returns."""

    id: UUID
    product_id: UUID
    vin: str
    year: int | None = None
    make: str | None = None
    model: str | None = None
    trim: str | None = None
    body_type: str | None = None
    body_style: str | None = None
    drivetrain: str | None = None
    transmission: str | None = None
    engine: str | None = None
    fuel_type: str | None = None
    mileage: int | None = None
    mileage_unit: str = "mi"
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
    def from_entity(cls, vehicle: Vehicle) -> "VehicleResponse":
        """Build response from domain entity."""
        return cls(
            id=vehicle.id,
            product_id=vehicle.product_id,
            vin=vehicle.vin,
            year=vehicle.year,
            make=vehicle.make,
            model=vehicle.model,
            trim=vehicle.trim,
            body_type=vehicle.body_type,
            body_style=vehicle.body_style,
            drivetrain=vehicle.drivetrain,
            transmission=vehicle.transmission,
            engine=vehicle.engine,
            fuel_type=vehicle.fuel_type,
            mileage=vehicle.mileage,
            mileage_unit=vehicle.mileage_unit,
            exterior_color=vehicle.exterior_color,
            interior_color=vehicle.interior_color,
            has_sunroof=vehicle.has_sunroof,
            has_navigation=vehicle.has_navigation,
            has_leather=vehicle.has_leather,
            has_backup_camera=vehicle.has_backup_camera,
            has_bluetooth=vehicle.has_bluetooth,
            has_remote_start=vehicle.has_remote_start,
            seat_material=vehicle.seat_material,
            vin_verified=vehicle.vin_verified,
            stock_number=vehicle.stock_number,
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
        )
