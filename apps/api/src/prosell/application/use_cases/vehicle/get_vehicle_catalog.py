"""Get vehicle catalog use case."""

from prosell.application.dto.vehicle.catalog import (
    CatalogResponseDTO,
    VehicleCatalogItemDTO,
)
from prosell.domain.entities.user import User
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository


class GetVehicleCatalogUseCase:
    """
    Get vehicle catalog with role-based filtering and publication state.

    This use case:
    1. Calls repository with user for role-based filtering
    2. Fetches publications for each vehicle
    3. Returns catalog with pagination metadata
    """

    def __init__(
        self,
        vehicle_repository: AbstractVehicleRepository,
        publication_repository: IPublicationRepository,
    ) -> None:
        """
        Initialize use case with repositories.

        Args:
            vehicle_repository: Vehicle repository for role-based filtering
            publication_repository: Publication repository for fetching state
        """
        self.vehicle_repository = vehicle_repository
        self.publication_repository = publication_repository

    async def execute(
        self,
        user: User,
        limit: int = 50,
        cursor: str | None = None,
    ) -> CatalogResponseDTO:
        """
        Execute the use case.

        Args:
            user: Current user with roles and tenant_id
            limit: Max vehicles to return (default 50)
            cursor: Pagination cursor from previous request

        Returns:
            CatalogResponseDTO with items, next_cursor, and has_more flag

        Raises:
            Unauthorized: If user has no dealer assignments (seller/manager)
        """
        # Get vehicles with role-based filtering
        vehicles, next_cursor, has_more = await self.vehicle_repository.get_catalog_for_user(
            user=user,
            limit=limit,
            cursor=cursor,
        )

        # Build catalog items with publication state
        items = []
        for vehicle in vehicles:
            # Fetch publications for this vehicle's product
            publications = await self.publication_repository.get_by_product_id(vehicle.product_id)

            # Create DTO with publications
            item = VehicleCatalogItemDTO.from_entities(vehicle, publications)
            items.append(item)

        return CatalogResponseDTO(
            items=items,
            next_cursor=next_cursor,
            has_more=has_more,
        )
