"""
Branch DTOs for API layer.

Defines request/response models for branch operations.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from prosell.domain.entities.branch import Branch


class CreateBranchRequest(BaseModel):
    """Request DTO for creating a branch."""

    name: str = Field(..., min_length=1, max_length=255, description="Branch name")
    slug: str | None = Field(
        None, max_length=100, description="URL-friendly identifier (auto-generated if not provided)"
    )
    logo_url: str | None = Field(None, max_length=500, description="Branch logo URL")
    address: str | None = Field(None, max_length=500, description="Street address")
    city: str | None = Field(None, max_length=100, description="City name")
    state: str | None = Field(None, max_length=100, description="State/province")
    country: str | None = Field(
        None, max_length=2, min_length=2, description="ISO 3166-1 alpha-2 country code"
    )
    postal_code: str | None = Field(None, max_length=20, description="Postal/ZIP code")
    phone: str | None = Field(None, max_length=50, description="Contact phone number")
    email: str | None = Field(None, max_length=255, description="Contact email")
    website: str | None = Field(None, max_length=500, description="Website URL")
    timezone: str = Field(
        "America/Montevideo", max_length=50, description="Timezone for branch operations"
    )
    settings: dict[str, Any] = Field(
        default_factory=dict, description="Branch-specific settings (JSONB)"
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "name": "Auto Plaza Montevideo",
                    "slug": "auto-plaza-mvd",
                    "logo_url": "https://example.com/logo.png",
                    "address": "Av. Italia 1234",
                    "city": "Montevideo",
                    "state": "Montevideo",
                    "country": "UY",
                    "postal_code": "11300",
                    "phone": "+598 99 123 456",
                    "email": "contact@autoplaza.com.uy",
                    "website": "https://autoplaza.com.uy",
                    "timezone": "America/Montevideo",
                    "settings": {"commission_rate": 0.05},
                }
            ]
        }
    }


class BranchResponse(BaseModel):
    """Response DTO for a single branch."""

    id: str
    tenant_id: str
    name: str
    slug: str
    logo_url: str | None
    address: str | None
    city: str | None
    state: str | None
    country: str | None
    postal_code: str | None
    phone: str | None
    email: str | None
    website: str | None
    timezone: str
    settings: dict[str, Any]
    latitude: float | None
    longitude: float | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, branch: Branch) -> "BranchResponse":
        """Create DTO from Branch domain entity."""
        return cls(
            id=str(branch.id),
            tenant_id=str(branch.tenant_id),
            name=branch.name,
            slug=branch.slug,
            logo_url=None,  # Branch entity doesn't have logo_url field
            address=branch.location_address,
            city=branch.location_city,
            state=branch.location_state,
            country=None,  # Branch entity doesn't have country field
            postal_code=branch.location_zip,
            phone=None,  # Branch entity doesn't have phone field
            email=None,  # Branch entity doesn't have email field
            website=None,  # Branch entity doesn't have website field
            timezone=branch.timezone,
            settings=branch.settings,
            latitude=branch.location_lat,
            longitude=branch.location_lng,
            created_at=branch.created_at,
            updated_at=branch.updated_at,
        )


class BranchListResponse(BaseModel):
    """Response DTO for paginated branch list."""

    items: list[BranchResponse]
    total: int
    limit: int
    offset: int
