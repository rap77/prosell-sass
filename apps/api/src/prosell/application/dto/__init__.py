"""Data Transfer Objects for ProSell SaaS application layer."""

from prosell.application.dto.category import (
    CategoryListResponse,
    CategoryResponse,
    CreateCategoryRequest,
)
from prosell.application.dto.product import (
    CreateProductRequest,
    ProductListResponse,
    ProductResponse,
    UpdateProductRequest,
)

__all__ = [
    "CategoryListResponse",
    "CategoryResponse",
    "CreateCategoryRequest",
    "CreateProductRequest",
    "ProductListResponse",
    "ProductResponse",
    "UpdateProductRequest",
]
