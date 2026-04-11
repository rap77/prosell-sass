"""
Create Dealer Use Case.

Orchestrates dealer creation with slug auto-generation and uniqueness validation.
"""

import uuid

from prosell.application.dto.dealer import CreateDealerRequest, DealerResponse
from prosell.domain.entities.dealer import Dealer
from prosell.domain.exceptions.dealer_exceptions import SlugNotUniqueError
from prosell.domain.repositories.dealer_repository import AbstractDealerRepository


class CreateDealerUseCase:
    """Use case for creating a new dealer."""

    def __init__(self, dealer_repository: AbstractDealerRepository):
        """Initialize use case with dealer repository."""
        self._dealer_repository = dealer_repository

    async def execute(self, request: CreateDealerRequest, tenant_id: uuid.UUID) -> DealerResponse:
        """
        Execute dealer creation.

        Args:
            request: CreateDealerRequest with dealer data
            tenant_id: Tenant UUID for multi-tenancy

        Returns:
            DealerResponse with created dealer data

        Raises:
            SlugNotUnique: If slug already exists in tenant
        """
        # Generate slug from name if not provided
        slug = request.slug or self._generate_slug(request.name)

        # Validate slug uniqueness
        exists = await self._dealer_repository.exists_by_slug(slug, tenant_id)
        if exists:
            raise SlugNotUniqueError(slug=slug, tenant_id=tenant_id)

        # Create dealer entity (map request fields to entity fields)
        dealer = Dealer.create(
            tenant_id=tenant_id,
            name=request.name,
            slug=slug,
            location_address=request.address,
            location_city=request.city,
            location_state=request.state,
            location_zip=request.postal_code,
            timezone=request.timezone,
            settings=request.settings,
        )

        # Persist dealer
        created_dealer = await self._dealer_repository.create(dealer)

        # Return response DTO
        return DealerResponse.from_entity(created_dealer)

    def _generate_slug(self, name: str) -> str:
        """
        Generate URL-friendly slug from name.

        Simple implementation: lowercase, replace spaces with hyphens.
        TODO: Enhance with better normalization (accent removal, etc.)
        """
        return name.lower().strip().replace(" ", "-")
