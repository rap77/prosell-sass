"""Create vehicle use case."""

from uuid import UUID

from prosell.application.dto.vehicle import CreateVehicleRequest
from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.exceptions.product_exceptions import VehicleAlreadyExistsError
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository


class CreateVehicleUseCase:
    """Create a vehicle for a product."""

    def __init__(
        self,
        vehicle_repository: AbstractVehicleRepository,
        product_repository: AbstractProductRepository,
    ) -> None:
        self.vehicle_repository = vehicle_repository
        self.product_repository = product_repository

    async def execute(self, request: CreateVehicleRequest) -> Vehicle:
        """
        Execute vehicle creation.

        Args:
            request: CreateVehicleRequest DTO

        Returns:
            Vehicle entity

        Raises:
            VehicleAlreadyExistsError: If product already has a vehicle
            ValueError: If VIN is invalid or product doesn't exist
        """
        # 1. Check if product exists
        product = await self.product_repository.get_by_id(
            request.product_id, UUID(int=0)
        )  # tenant_id not used
        if not product:
            raise ValueError(f"Product not found: {request.product_id}")

        # 2. Check if vehicle already exists for this product
        existing_vehicle = await self.vehicle_repository.get_by_product_id(request.product_id)
        if existing_vehicle:
            raise VehicleAlreadyExistsError(str(request.product_id))

        # 3. Check if VIN already exists (if different product)
        if await self.vehicle_repository.exists_by_vin(request.vin):
            # Check if it's for this product (recreating)
            existing = await self.vehicle_repository.get_by_vin(request.vin)
            if existing and existing.product_id != request.product_id:
                raise ValueError(f"VIN already assigned to another product: {request.vin}")

        # 4. Create vehicle entity
        vehicle = Vehicle.create(
            product_id=request.product_id,
            vin=request.vin,
            year=request.year,
            make=request.make,
            model=request.model,
            trim=request.trim,
            body_type=request.body_type,
            drivetrain=request.drivetrain,
            transmission=request.transmission,
            engine=request.engine,
            fuel_type=request.fuel_type,
            mileage=request.mileage,
            mileage_unit=request.mileage_unit,
            exterior_color=request.exterior_color,
            interior_color=request.interior_color,
        )

        # 5. Persist
        vehicle = await self.vehicle_repository.create(vehicle)

        return vehicle
