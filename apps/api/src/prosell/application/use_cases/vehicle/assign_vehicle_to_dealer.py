"""Use case for assigning a vehicle to a dealer (organization)."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.dto.vehicle.assign_dealer import AssignDealerResponse
from prosell.domain.exceptions import OrganizationNotFoundException, ProductNotFoundError
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.infrastructure.models.organization_model import OrganizationModel
from prosell.infrastructure.models.product_model import ProductModel


class AssignVehicleToDealerUseCase:
    """
    Assign a vehicle to a dealer (organization).

    This updates the product.organization_id field.
    """

    def __init__(
        self,
        vehicle_repository: AbstractVehicleRepository,
        product_repository: AbstractProductRepository,
        session: AsyncSession,
    ) -> None:
        """
        Initialize use case with repositories.

        Args:
            vehicle_repository: Vehicle repository
            product_repository: Product repository
            session: Database session for querying organization
        """
        self.vehicle_repository = vehicle_repository
        self.product_repository = product_repository
        self.session = session

    async def execute(
        self,
        vehicle_id: UUID,
        dealer_id: UUID,
        tenant_id: UUID,
    ) -> AssignDealerResponse:
        """
        Execute the use case.

        Args:
            vehicle_id: Vehicle UUID to assign
            dealer_id: Organization UUID to assign to
            tenant_id: Tenant UUID for isolation

        Returns:
            AssignDealerResponse with updated vehicle info

        Raises:
            NotFound: If vehicle or dealer not found
            ValueError: If dealer is not in same tenant
        """
        # Verify vehicle exists
        vehicle = await self.vehicle_repository.get_by_id(vehicle_id)
        if not vehicle:
            raise ProductNotFoundError(f"Vehicle not found: {vehicle_id}")

        # Verify dealer (organization) exists and is in same tenant
        stmt = select(OrganizationModel).where(
            OrganizationModel.id == dealer_id,
            OrganizationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        org = result.scalar_one_or_none()

        if not org:
            raise OrganizationNotFoundException(f"Dealer (organization) not found: {dealer_id}")

        # Update product's organization_id
        stmt = select(ProductModel).where(ProductModel.id == vehicle.product_id)
        result = await self.session.execute(stmt)
        product_model = result.scalar_one_or_none()

        if not product_model:
            raise ProductNotFoundError(f"Product not found for vehicle: {vehicle_id}")

        # Verify product is in same tenant
        if product_model.tenant_id != tenant_id:
            raise ValueError("Vehicle does not belong to your tenant")

        # Update organization_id
        product_model.organization_id = dealer_id
        await self.session.flush()

        return AssignDealerResponse(
            id=vehicle.id,
            product_id=vehicle.product_id,
            vin=vehicle.vin,
            dealer_id=dealer_id,
            dealer_name=org.name,
        )
