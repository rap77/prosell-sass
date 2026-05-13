"""Vendedor (salesperson) DTOs for ProSell SaaS."""

from typing import List

from pydantic import BaseModel, Field
from typing_extensions import Annotated


class VendedorResponse(BaseModel):
    """Vendedor response DTO."""

    id: str = Field(..., description="Vendedor ID (user_id)")
    user_id: str = Field(..., description="User ID")
    tenant_id: str = Field(..., description="Tenant/Organization ID")
    name: str = Field(..., description="Full name")
    email: str = Field(..., description="Email address")
    role: str = Field(..., description="User role (e.g., 'vendedor')")
    created_at: str = Field(..., description="Creation timestamp (ISO 8601)")
    updated_at: str = Field(..., description="Last update timestamp (ISO 8601)")


class VendedorListResponse(BaseModel):
    """Vendedor list response DTO."""

    items: Annotated[List[VendedorResponse], Field(default_factory=list, description="List of vendedores")]
    total: Annotated[int, Field(..., description="Total number of vendedores")]
    limit: Annotated[int, Field(..., description="Page size limit")]
    offset: Annotated[int, Field(..., description="Number of items skipped")]
