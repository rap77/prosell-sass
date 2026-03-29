"""Vehicle DTOs."""

from prosell.application.dto.vehicle.catalog import (
    CatalogResponseDTO,
    PublicationDTO,
    VehicleCatalogItemDTO,
)
from prosell.application.dto.vehicle.create import (
    CreateVehicleRequest,
    DecodeVinRequest,
    DecodeVinResponse,
    VehicleData,
)

__all__ = [
    "CatalogResponseDTO",
    "CreateVehicleRequest",
    "DecodeVinRequest",
    "DecodeVinResponse",
    "PublicationDTO",
    "VehicleCatalogItemDTO",
    "VehicleData",
]
