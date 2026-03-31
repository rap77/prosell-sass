"""Vehicle DTOs."""

from prosell.application.dto.vehicle.assign_dealer import (
    AssignDealerRequest,
    AssignDealerResponse,
)
from prosell.application.dto.vehicle.bulk_upload import (
    BulkUploadError,
    BulkUploadResponse,
    VehicleCSVRow,
)
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
    "AssignDealerRequest",
    "AssignDealerResponse",
    "BulkUploadError",
    "BulkUploadResponse",
    "CatalogResponseDTO",
    "CreateVehicleRequest",
    "DecodeVinRequest",
    "DecodeVinResponse",
    "PublicationDTO",
    "VehicleCSVRow",
    "VehicleCatalogItemDTO",
    "VehicleData",
]
