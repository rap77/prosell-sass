"""Get vehicle catalog use case."""

from prosell.application.dto.vehicle.catalog import (
    CatalogResponseDTO,
    FilterParams,
    VehicleCatalogItemDTO,
)
from prosell.domain.entities.user import User
from prosell.domain.entities.vehicle import Vehicle
from prosell.domain.repositories.publication_repository import IPublicationRepository
from prosell.domain.repositories.vehicle_repository import AbstractVehicleRepository
from prosell.domain.value_objects.vehicle_with_dealer import VehicleWithDealerInfo


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
        filters: FilterParams | None = None,
    ) -> CatalogResponseDTO:
        """
        Execute the use case.

        Args:
            user: Current user with roles and tenant_id
            limit: Max vehicles to return (default 50)
            cursor: Pagination cursor from previous request
            filters: Dynamic filter parameters (make, model, year, price, etc.)

        Returns:
            CatalogResponseDTO with items, next_cursor, and has_more flag

        Raises:
            Unauthorized: If user has no dealer assignments (seller/manager)
        """
        # Get vehicles with role-based filtering and dynamic filters
        result = await self.vehicle_repository.get_catalog_for_user(
            user=user,
            limit=limit,
            cursor=cursor,
            filters=filters,
        )
        vehicles: list[VehicleWithDealerInfo] = result[0]
        next_cursor: str | None = result[1]
        has_more: bool = result[2]

        # Build catalog items with publication state and dealer info
        items: list[VehicleCatalogItemDTO] = []
        for vehicle_with_dealer in vehicles:
            # Extract vehicle and dealer info from wrapper
            vehicle: Vehicle = vehicle_with_dealer.vehicle  # type: ignore[arg-type]
            dealer_id = vehicle_with_dealer.dealer_id
            dealer_name = vehicle_with_dealer.dealer_name

            # Fetch publications for this vehicle's product
            publications = await self.publication_repository.get_by_product_id(
                vehicle.product_id,  # type: ignore[arg-type]
            )

            # Create DTO with publications and dealer info
            item = VehicleCatalogItemDTO.from_entities(
                vehicle,  # type: ignore[arg-type]
                publications,
                dealer_id=dealer_id,
                dealer_name=dealer_name,
            )
            items.append(item)

        return CatalogResponseDTO(
            items=items,
            next_cursor=next_cursor,
            has_more=has_more,
        )
