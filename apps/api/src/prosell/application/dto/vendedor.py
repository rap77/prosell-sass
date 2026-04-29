"""Vendedor (salesperson) DTOs for ProSell SaaS."""

from pydantic import BaseModel, Field


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

    items: list[VendedorResponse] = Field(default_factory=list, description="List of vendedores")
    total: int = Field(..., description="Total number of vendedores")
    limit: int = Field(..., description="Page size limit")
    offset: int = Field(..., description="Number of items skipped")
