"""Vehicle repository interface."""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING
from uuid import UUID

from prosell.domain.entities.vehicle import Vehicle

if TYPE_CHECKING:
    from prosell.domain.entities.user import User


class AbstractVehicleRepository(ABC):
    """Repository interface for Vehicle entities."""

    @abstractmethod
    async def create(self, vehicle: Vehicle) -> Vehicle:
        """
        Create a new vehicle.

        Args:
            vehicle: Vehicle entity to create

        Returns:
            Created vehicle with generated ID
        """
        pass

    @abstractmethod
    async def get_by_id(self, vehicle_id: UUID) -> Vehicle | None:
        """
        Get vehicle by ID.

        Args:
            vehicle_id: Vehicle UUID

        Returns:
            Vehicle entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_product_id(self, product_id: UUID) -> Vehicle | None:
        """
        Get vehicle by product ID.

        Args:
            product_id: Product UUID

        Returns:
            Vehicle entity or None if not found
        """
        pass

    @abstractmethod
    async def get_by_vin(self, vin: str) -> Vehicle | None:
        """
        Get vehicle by VIN.

        Args:
            vin: Vehicle Identification Number

        Returns:
            Vehicle entity or None if not found
        """
        pass

    @abstractmethod
    async def update(self, vehicle: Vehicle) -> Vehicle:
        """
        Update an existing vehicle.

        Args:
            vehicle: Vehicle entity with updated fields

        Returns:
            Updated vehicle
        """
        pass

    @abstractmethod
    async def delete(self, vehicle_id: UUID) -> bool:
        """
        Delete a vehicle.

        Args:
            vehicle_id: Vehicle UUID

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists_by_vin(self, vin: str) -> bool:
        """
        Check if vehicle with VIN exists.

        Args:
            vin: Vehicle Identification Number

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def get_vins_batch(self, vins: list[str], tenant_id: UUID) -> list[str]:
        """
        Get all existing VINs in a single query (N+1 optimization).

        Args:
            vins: List of VINs to check
            tenant_id: Tenant UUID for isolation

        Returns:
            List of VINs that already exist in database
        """
        pass

    @abstractmethod
    async def search_by_make_model(
        self,
        make: str | None = None,
        model: str | None = None,
        year: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Vehicle]:
        """
        Search vehicles by make, model, year.

        Args:
            make: Vehicle make (optional)
            model: Vehicle model (optional)
            year: Model year (optional)
            skip: Number of records to skip
            limit: Max records to return

        Returns:
            List of vehicles
        """
        pass

    @abstractmethod
    async def get_catalog_for_user(
        self,
        user: "User",
        limit: int = 50,
        cursor: str | None = None,
    ) -> tuple[list[Vehicle], str | None, bool]:
        """
        Get vehicles for user based on role with cursor pagination.

        Role-based filtering:
        - Admin: sees all vehicles in tenant (no dealer filter)
        - Dealer: sees only vehicles from their organization (dealer_id == user.dealer_id)
        - Seller/Manager: sees vehicles from assigned dealers (IN subquery)

        Args:
            user: User entity with roles and tenant_id
            limit: Max vehicles to return (default 50)
            cursor: Pagination cursor (encoded vehicle ID + timestamp)

        Returns:
            Tuple of (vehicles list, next_cursor or None, has_more flag)

        Raises:
            Unauthorized: If seller/manager has no dealer assignments
        """
        pass
