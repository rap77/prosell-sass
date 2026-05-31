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
    PreviewRowResponse,
    PreviewSummaryResponse,
)
from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.response import ProductListResponse, ProductResponse
from prosell.application.dto.product.update import UpdateProductRequest

__all__ = [
    # Request/Response models
    "BulkUploadPreviewResponse",
    "CreateProductRequest",
    "GenericProductAttributes",
    "PreviewRowResponse",
    "PreviewSummaryResponse",
    "ProductAttributes",
    "ProductListResponse",
    "ProductResponse",
    "RealEstateAttributes",
    "UpdateProductRequest",
    # Attribute models
    "VehicleAttributes",
    "product_attributes_adapter",
    "validate_generic_attributes",
    "validate_real_estate_attributes",
    "validate_vehicle_attributes",
]
