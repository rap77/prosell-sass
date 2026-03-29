"""Catalog DTOs for vehicle listing with pagination."""

from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, field_validator

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


class FilterParams(BaseModel):
    """Dynamic filter parameters for vehicle catalog."""

    # String equality filters
    make: str | None = None
    model: str | None = None

    # Numeric range filters
    year_min: int | None = None
    year_max: int | None = None

    # Full-text search
    search: str | None = None

    @field_validator("year_min", "year_max")
    @classmethod
    def validate_positive(cls, v: int | None) -> int | None:
        """Validate numeric values are positive."""
        if v is not None and v < 0:
            raise ValueError("Value must be positive")
        return v

    @field_validator("year_max")
    @classmethod
    def validate_year_range(cls, v: int | None, info) -> int | None:
        """Validate year_min <= year_max."""
        if v is not None and info.data.get("year_min") is not None and v < info.data["year_min"]:
            raise ValueError("year_max must be >= year_min")
        return v
