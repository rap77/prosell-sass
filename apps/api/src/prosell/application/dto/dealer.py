"""
Dealer DTOs for API layer.

Defines request/response models for dealer operations.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from prosell.domain.entities.dealer import Dealer


class CreateDealerRequest(BaseModel):
    """Request DTO for creating a dealer."""

    name: str = Field(..., min_length=1, max_length=255, description="Dealer name")
    slug: str | None = Field(
        None, max_length=100, description="URL-friendly identifier (auto-generated if not provided)"
    )
    logo_url: str | None = Field(None, max_length=500, description="Dealer logo URL")
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
        "America/Montevideo", max_length=50, description="Timezone for dealer operations"
    )
    settings: dict[str, Any] = Field(
        default_factory=dict, description="Dealer-specific settings (JSONB)"
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


class DealerResponse(BaseModel):
    """Response DTO for a single dealer."""

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
    def from_entity(cls, dealer: Dealer) -> "DealerResponse":
        """Create DTO from Dealer domain entity."""
        return cls(
            id=str(dealer.id),
            tenant_id=str(dealer.tenant_id),
            name=dealer.name,
            slug=dealer.slug,
            logo_url=dealer.logo_url,
            address=dealer.address,
            city=dealer.city,
            state=dealer.state,
            country=dealer.country,
            postal_code=dealer.postal_code,
            phone=dealer.phone,
            email=dealer.email,
            website=dealer.website,
            timezone=dealer.timezone,
            settings=dealer.settings,
            latitude=dealer.latitude,
            longitude=dealer.longitude,
            created_at=dealer.created_at,
            updated_at=dealer.updated_at,
        )


class DealerListResponse(BaseModel):
    """Response DTO for paginated dealer list."""

    items: list[DealerResponse]
    total: int
    limit: int
    offset: int
