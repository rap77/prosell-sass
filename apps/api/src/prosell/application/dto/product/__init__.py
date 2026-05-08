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
from prosell.application.dto.product.create import CreateProductRequest
from prosell.application.dto.product.response import ProductListResponse, ProductResponse
from prosell.application.dto.product.update import UpdateProductRequest

__all__ = [
    # Attribute models
    "VehicleAttributes",
    "RealEstateAttributes",
    "GenericProductAttributes",
    "ProductAttributes",
    "product_attributes_adapter",
    "validate_vehicle_attributes",
    "validate_real_estate_attributes",
    "validate_generic_attributes",
    # Request/Response models
    "CreateProductRequest",
    "ProductListResponse",
    "ProductResponse",
    "UpdateProductRequest",
]
