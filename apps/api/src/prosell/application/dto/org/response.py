"""Organization response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from prosell.domain.entities.organization import Organization
from prosell.domain.value_objects.organization_contact import (
    ContactCategory,
    OrganizationContact,
)


class OrganizationContactDTO(BaseModel):
    """DTO for organization contact in responses."""

    id: str
    name: str | None = None
    category: ContactCategory
    custom_label: str | None = None
    phone: str | None = None
    email: str | None = None
    whatsapp: str | None = None
    order: int = 0

    @classmethod
    def from_vo(cls, contact: OrganizationContact) -> "OrganizationContactDTO":
        """Build from value object."""
        return cls(
            id=contact.id,
            name=contact.name,
            category=contact.category,
            custom_label=contact.custom_label,
            phone=contact.phone,
            email=contact.email,
            whatsapp=contact.whatsapp,
            order=contact.order,
        )


class VerticalProductCountDTO(BaseModel):
    """Product count for a root category shown in organization summaries."""

    vertical_id: UUID
    vertical_name: str
    product_count: int


class OrganizationResponse(BaseModel):
    """DTO for organization responses."""

    id: UUID
    name: str
    code: str | None = None  # Short abbreviation (max 5 chars, uppercase)
    color: str | None = None  # Tag color (hex, e.g. "#4DB8FF")
    tenant_id: UUID
    status: str
    logo_url: str | None = None
    banner_url: str | None = None
    description: str | None = None
    website: str | None = None
    phone: str | None = None
    # Contact
    email: str | None = None
    whatsapp: str | None = None
    # Address
    street_address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    # Legal
    tax_id: str | None = None
    # Social
    instagram: str | None = None
    facebook: str | None = None
    # Meta
    verified_at: datetime | None = None
    wallet_id: UUID | None = None
    setup_complete: bool = False
    settings: dict[str, object] = Field(default_factory=dict)
    contacts: list[OrganizationContactDTO] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    broker_count: int | None = None  # populated when listing organizations
    owner_email: str | None = None  # populated when listing organizations (latest invitation)
    product_count: int = 0  # populated when listing organizations
    vertical_product_counts: list[VerticalProductCountDTO] = Field(default_factory=list)

    @classmethod
    def from_entity(
        cls,
        org: Organization,
        *,
        broker_count: int | None = None,
        owner_email: str | None = None,
        product_count: int = 0,
        vertical_product_counts: list[VerticalProductCountDTO] | None = None,
    ) -> "OrganizationResponse":
        """Build response from domain entity."""
        return cls(
            id=org.id,
            name=org.name,
            code=org.code,
            color=org.color,
            tenant_id=org.tenant_id,
            status=org.status.value,
            logo_url=org.logo_url,
            banner_url=org.banner_url,
            description=org.description,
            website=org.website,
            phone=org.phone,
            email=org.email,
            whatsapp=org.whatsapp,
            street_address=org.street_address,
            city=org.city,
            state=org.state,
            postal_code=org.postal_code,
            country=org.country,
            tax_id=org.tax_id,
            instagram=org.instagram,
            facebook=org.facebook,
            verified_at=org.verified_at,
            wallet_id=org.wallet_id,
            setup_complete=org.setup_complete,
            settings=org.settings,
            contacts=[OrganizationContactDTO.from_vo(c) for c in org.contacts],
            created_at=org.created_at,
            updated_at=org.updated_at,
            broker_count=broker_count,
            owner_email=owner_email,
            product_count=product_count,
            vertical_product_counts=vertical_product_counts or [],
        )


class OrganizationListResponse(BaseModel):
    """DTO for paginated organization list."""

    organizations: list[OrganizationResponse]
    total: int
    skip: int
    limit: int
