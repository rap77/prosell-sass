"""Use case for bulk assigning vehicles to a dealer (organization)."""

from uuid import UUID

from prosell.application.dto.vehicle.bulk_assign_dealer import (
    BulkAssignDealerRequest,
    BulkAssignDealerResponse,
)
from prosell.domain.exceptions import OrganizationNotFoundException, ProductNotFoundError
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.repositories.product_repository import AbstractProductRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository


class BulkAssignDealerUseCase:
    """
    Bulk assign vehicles to a dealer (organization).

    This updates the products' organization_id field for all specified vehicles.
    """

    def __init__(
        self,
        vehicle_repository: AbstractVehicleRepository,
        product_repository: AbstractProductRepository,
        organization_repository: AbstractOrganizationRepository,
    ) -> None:
        """
        Initialize use case with repositories.

        Args:
            vehicle_repository: Vehicle repository
            product_repository: Product repository
            organization_repository: Organization repository
        """
        self.vehicle_repository = vehicle_repository
        self.product_repository = product_repository
        self.organization_repository = organization_repository

    async def execute(
        self,
        request: BulkAssignDealerRequest,
        tenant_id: UUID,
    ) -> BulkAssignDealerResponse:
        """
        Execute the use case.

        Args:
            request: BulkAssignDealerRequest with vehicle_ids and dealer_id
            tenant_id: Tenant UUID for isolation

        Returns:
            BulkAssignDealerResponse with assigned_count, failed_count, and errors

        Raises:
            OrganizationNotFoundException: If dealer not found in tenant
        """
        # Verify dealer (organization) exists and is in same tenant
        org = await self.organization_repository.get_by_id(
            request.dealer_id,
            tenant_id,
        )
        if not org:
            raise OrganizationNotFoundException(
                f"Dealer (organization) not found: {request.dealer_id}",
            )

        errors = []
        assigned_count = 0

        for vehicle_id in request.vehicle_ids:
            try:
                # Get vehicle
                vehicle = await self.vehicle_repository.get_by_id(vehicle_id)
                if not vehicle:
                    errors.append(f"Vehicle {vehicle_id} not found")
                    continue

                # Get product to verify tenant ownership
                product = await self.product_repository.get_by_id(
                    vehicle.product_id,
                    tenant_id,
                )
                if not product:
                    msg = f"Product {vehicle.product_id} not found " f"for vehicle {vehicle_id}"
                    errors.append(msg)
                    continue

                # Update product's organization
                product.organization_id = request.dealer_id
                await self.product_repository.update(product)
                assigned_count += 1

            except (ProductNotFoundError, OrganizationNotFoundException):
                errors.append(f"Error assigning vehicle {vehicle_id}: not found")
            except Exception as e:
                msg = f"Unexpected error assigning vehicle {vehicle_id}: {e!s}"
                errors.append(msg)

        return BulkAssignDealerResponse(
            assigned_count=assigned_count,
            failed_count=len(errors),
            errors=errors,
        )
