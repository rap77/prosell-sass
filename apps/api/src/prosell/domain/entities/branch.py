"""Branch entity - Pure domain logic with no external dependencies."""

import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from prosell.domain.base import DomainModel, Field


class Branch(DomainModel):
    """
    Branch entity (aka Organization).

    Pure domain logic - no external dependencies.
    All business rules for branches live here.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID
    name: str
    slug: str

    # Location fields (all optional)
    location_address: str | None = None
    location_city: str | None = None
    location_state: str | None = None
    location_zip: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None

    # Business fields
    timezone: str = "America/Montevideo"
    settings: dict[str, object] = Field(default_factory=dict)

    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def create(
        cls,
        name: str,
        tenant_id: UUID,
        slug: str | None = None,
        # Generic passthrough for the remaining optional fields not listed
        # above (location_*, timezone, settings, etc.) so this factory
        # doesn't have to re-declare every field Pydantic validates.
        **kwargs: Any,
    ) -> "Branch":
        """
        Factory method for new branch creation.

        Args:
            name: Branch name
            tenant_id: Unique tenant identifier
            slug: Optional custom slug (auto-generated from name if not provided)
            **kwargs: Additional optional fields (location, timezone, settings)

        Returns:
            New Branch entity
        """
        # Generate slug only if not provided (None or empty/whitespace string)
        final_slug = cls._generate_slug(name) if slug is None or not slug.strip() else slug

        return cls(
            id=uuid4(),
            name=name,
            tenant_id=tenant_id,
            slug=final_slug,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    @staticmethod
    def _generate_slug(name: str) -> str:
        """
        Generate SEO-friendly slug from name.

        Rules:
        - Convert to lowercase
        - Replace spaces and special chars with hyphens
        - Remove consecutive hyphens
        - Strip leading/trailing hyphens

        Examples:
        - "Toyota Centro" → "toyota-centro"
        - "Ford Motors Uruguay!" → "ford-motors-uruguay"
        """
        # Convert to lowercase
        slug = name.lower()
        # Replace non-alphanumeric chars (except hyphens) with hyphens
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        # Remove leading/trailing hyphens
        slug = slug.strip("-")
        return slug

    def update_basic_info(
        self,
        name: str | None = None,
        location_address: str | None = None,
        location_city: str | None = None,
        location_state: str | None = None,
        location_zip: str | None = None,
        location_lat: float | None = None,
        location_lng: float | None = None,
        timezone: str | None = None,
    ) -> None:
        """
        Update basic branch information.

        Args:
            name: New name (optional)
            location_address: New address (optional)
            location_city: New city (optional)
            location_state: New state (optional)
            location_zip: New zip code (optional)
            location_lat: New latitude (optional)
            location_lng: New longitude (optional)
            timezone: New timezone (optional)
        """
        if name is not None:
            self.name = name
        if location_address is not None:
            self.location_address = location_address
        if location_city is not None:
            self.location_city = location_city
        if location_state is not None:
            self.location_state = location_state
        if location_zip is not None:
            self.location_zip = location_zip
        if location_lat is not None:
            self.location_lat = location_lat
        if location_lng is not None:
            self.location_lng = location_lng
        if timezone is not None:
            self.timezone = timezone

        self.updated_at = datetime.now(UTC)

    def update_settings(self, settings: dict[str, object]) -> None:
        """
        Update branch settings.

        Args:
            settings: Dictionary of settings (merged with existing)
        """
        self.settings = {**self.settings, **settings}
        self.updated_at = datetime.now(UTC)
