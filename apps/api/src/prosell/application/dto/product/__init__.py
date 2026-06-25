"""Product DTOs."""

from prosell.application.dto.product.attributes import (
    GenericProductAttributes,
    ProductAttributes,
    RealEstateAttributes,
    VehicleAttributes,
    product_attributes_adapter,
    validate_generic_attributes,
    validate_real_estate_attributes,
    validate_vehicle_attributes,
)
from prosell.application.dto.product.bulk_upload import (
    BulkUploadPreviewResponse,
    BulkUploadVehiclesResponse,
    PreviewRowResponse,
    PreviewSummaryResponse,
    VehicleImportRowResponse,
)
from prosell.application.dto.product.bulk_upload_result import (
    BulkUploadRowError,
    BulkUploadUploadResult,
)
from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.image_urls_response import (
    ProductImageUrlResponse,
    ProductImageUrlsResponse,
)
from prosell.application.dto.product.reject import RejectProductRequest
from prosell.application.dto.product.response import ProductListResponse, ProductResponse
from prosell.application.dto.product.update import UpdateProductRequest

__all__ = [
    # Request/Response models
    "BulkUploadPreviewResponse",
    "BulkUploadRowError",
    "BulkUploadUploadResult",
    "BulkUploadVehiclesResponse",
    "CreateProductRequest",
    # Attribute models
    "GenericProductAttributes",
    "PreviewRowResponse",
    "PreviewSummaryResponse",
    "ProductAttributes",
    "ProductImageUrlResponse",
    "ProductImageUrlsResponse",
    "ProductListResponse",
    "ProductResponse",
    "RealEstateAttributes",
    "RejectProductRequest",
    "UpdateProductRequest",
    "VehicleAttributes",
    "VehicleImportRowResponse",
    "product_attributes_adapter",
    "validate_generic_attributes",
    "validate_real_estate_attributes",
    "validate_vehicle_attributes",
]
