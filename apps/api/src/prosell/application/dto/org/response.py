"""Organization response DTOs."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from prosell.domain.entities.organization import Organization


class OrganizationResponse(BaseModel):
    """DTO for organization responses."""

    id: UUID
    name: str
    tenant_id: UUID
    status: str
    logo_url: str | None = None
    banner_url: str | None = None
    description: str | None = None
    website: str | None = None
    phone: str | None = None
    verified_at: datetime | None = None
    wallet_id: UUID | None = None
    setup_complete: bool = False
    settings: dict[str, object] = {}
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_entity(cls, org: Organization) -> "OrganizationResponse":
        """Build response from domain entity."""
        return cls(
            id=org.id,
            name=org.name,
            tenant_id=org.tenant_id,
            status=org.status.value,
            logo_url=org.logo_url,
            banner_url=org.banner_url,
            description=org.description,
            website=org.website,
            phone=org.phone,
            verified_at=org.verified_at,
            wallet_id=org.wallet_id,
            setup_complete=org.setup_complete,
            settings=org.settings,
            created_at=org.created_at,
            updated_at=org.updated_at,
        )


class OrganizationListResponse(BaseModel):
    """DTO for paginated organization list."""

    organizations: list[OrganizationResponse]
    total: int
    skip: int
    limit: int
