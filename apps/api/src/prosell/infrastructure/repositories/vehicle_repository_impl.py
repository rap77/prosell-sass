"""SQLAlchemy implementation of Vehicle repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.models.vehicle_model import VehicleModel


class SqlAlchemyVehicleRepository(AbstractVehicleRepository):
    """SQLAlchemy implementation of VehicleRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, vehicle: Vehicle) -> Vehicle:
        """Create a new vehicle."""
        model = VehicleModel(
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
            mpg_city=vehicle.mpg_city,
            mpg_highway=vehicle.mpg_highway,
            mpg_combined=vehicle.mpg_combined,
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
            vin_decoded_data=vehicle.vin_decoded_data,
            vin_decoded_at=vehicle.vin_decoded_at,
            stock_number=vehicle.stock_number,
            vin_verified=vehicle.vin_verified,
            created_at=vehicle.created_at,
            updated_at=vehicle.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, vehicle_id: UUID) -> Vehicle | None:
        """Get vehicle by ID."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_product_id(self, product_id: UUID) -> Vehicle | None:
        """Get vehicle by product ID."""
        stmt = select(VehicleModel).where(VehicleModel.product_id == product_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_vin(self, vin: str) -> Vehicle | None:
        """Get vehicle by VIN."""
        stmt = select(VehicleModel).where(VehicleModel.vin == vin.upper())
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, vehicle: Vehicle) -> Vehicle:
        """Update an existing vehicle."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Vehicle not found: {vehicle.id}")

        model.vin = vehicle.vin
        model.year = vehicle.year
        model.make = vehicle.make
        model.model = vehicle.model
        model.trim = vehicle.trim
        model.body_type = vehicle.body_type
        model.body_style = vehicle.body_style
        model.drivetrain = vehicle.drivetrain
        model.transmission = vehicle.transmission
        model.engine = vehicle.engine
        model.fuel_type = vehicle.fuel_type
        model.mpg_city = vehicle.mpg_city
        model.mpg_highway = vehicle.mpg_highway
        model.mpg_combined = vehicle.mpg_combined
        model.mileage = vehicle.mileage
        model.mileage_unit = vehicle.mileage_unit
        model.exterior_color = vehicle.exterior_color
        model.interior_color = vehicle.interior_color
        model.has_sunroof = vehicle.has_sunroof
        model.has_navigation = vehicle.has_navigation
        model.has_leather = vehicle.has_leather
        model.has_backup_camera = vehicle.has_backup_camera
        model.has_bluetooth = vehicle.has_bluetooth
        model.has_remote_start = vehicle.has_remote_start
        model.seat_material = vehicle.seat_material
        model.vin_decoded_data = vehicle.vin_decoded_data
        model.vin_decoded_at = vehicle.vin_decoded_at
        model.stock_number = vehicle.stock_number
        model.vin_verified = vehicle.vin_verified

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, vehicle_id: UUID) -> bool:
        """Delete a vehicle."""
        stmt = select(VehicleModel).where(VehicleModel.id == vehicle_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def exists_by_vin(self, vin: str) -> bool:
        """Check if vehicle with VIN exists."""
        stmt = select(func.count(VehicleModel.id)).where(
            VehicleModel.vin == vin.upper(),
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0  # type: ignore[assignment]
        return count > 0

    async def search_by_make_model(
        self,
        make: str | None = None,
        model: str | None = None,
        year: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Vehicle]:
        """Search vehicles by make, model, year."""
        stmt = select(VehicleModel)

        if make is not None:
            stmt = stmt.where(VehicleModel.make.ilike(f"%{make}%"))

        if model is not None:
            stmt = stmt.where(VehicleModel.model.ilike(f"%{model}%"))

        if year is not None:
            stmt = stmt.where(VehicleModel.year == year)

        stmt = stmt.order_by(VehicleModel.year.desc(), VehicleModel.make, VehicleModel.model)
        stmt = stmt.offset(skip).limit(limit)

        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    def _to_entity(self, model: VehicleModel) -> Vehicle:
        """Convert ORM model to domain entity."""
        return Vehicle.model_validate(model, from_attributes=True)
