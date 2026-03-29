"""Catalog DTOs for vehicle listing with pagination."""

from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel

if TYPE_CHECKING:
    from prosell.domain.entities.publication import Publication
    from prosell.domain.entities.vehicle import Vehicle


class PublicationDTO(BaseModel):
    """Publication state for a vehicle."""

    id: UUID
    status: str
    platform: str
    fb_listing_id: str | None = None
    published_at: str | None = None
    expires_at: str | None = None
    strategy_used: str | None = None

    @classmethod
    def from_entity(cls, publication: "Publication") -> "PublicationDTO":
        """Create DTO from Publication entity."""
        return cls(
            id=publication.id,
            status=publication.status.value,
            platform=publication.platform,
            fb_listing_id=publication.fb_listing_id,
            published_at=publication.published_at.isoformat() if publication.published_at else None,
            expires_at=publication.expires_at.isoformat() if publication.expires_at else None,
            strategy_used=publication.strategy_used,
        )


class VehicleCatalogItemDTO(BaseModel):
    """Vehicle item in catalog with publication state."""

    id: UUID
    product_id: UUID
    vin: str
    year: int
    make: str
    model: str
    trim: str | None = None
    mileage: int | None = None
    exterior_color: str | None = None
    interior_color: str | None = None
    price_cents: int | None = None
    created_at: str
    publications: list[PublicationDTO] = []

    @classmethod
    def from_entities(
        cls,
        vehicle: "Vehicle",
        publications: list["Publication"] | None = None,
    ) -> "VehicleCatalogItemDTO":
        """Create DTO from Vehicle entity and optional publications."""

        # Convert publications to DTOs
        publication_dtos: list[PublicationDTO] = []
        if publications:
            publication_dtos = [PublicationDTO.from_entity(pub) for pub in publications]

        return cls(
            id=vehicle.id,
            product_id=vehicle.product_id,
            vin=vehicle.vin,
            year=vehicle.year,
            make=vehicle.make,
            model=vehicle.model,
            trim=vehicle.trim,
            mileage=vehicle.mileage,
            exterior_color=vehicle.exterior_color,
            interior_color=vehicle.interior_color,
            price_cents=None,  # Will be populated from Product if needed
            created_at=vehicle.created_at.isoformat(),
            publications=publication_dtos,
        )


class CatalogResponseDTO(BaseModel):
    """Catalog response with pagination."""

    items: list[VehicleCatalogItemDTO]
    next_cursor: str | None = None
    has_more: bool = False
