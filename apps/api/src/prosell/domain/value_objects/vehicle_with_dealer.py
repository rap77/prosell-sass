"""Value objects for vehicle with additional information."""

from dataclasses import dataclass
from uuid import UUID

from prosell.domain.entities.vehicle import Vehicle


@dataclass(frozen=True)
class VehicleWithDealerInfo:
    """Vehicle entity with additional dealer information.

    This wrapper provides type-safe access to dealer information
    that's joined from the organization table, without modifying
    the Vehicle entity itself (which should remain pure domain).

    Attributes:
        vehicle: The Vehicle entity
        dealer_id: Organization ID if assigned, None otherwise
        dealer_name: Organization name if assigned, None otherwise
    """

    vehicle: Vehicle
    dealer_id: UUID | None
    dealer_name: str | None
