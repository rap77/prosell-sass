"""
Create Branch Use Case.

Orchestrates branch creation with slug auto-generation and uniqueness validation.
"""

import uuid

from prosell.application.dto.branch import CreateBranchRequest, BranchResponse
from prosell.domain.entities.branch import Branch
from prosell.domain.exceptions.branch_exceptions import SlugNotUniqueError
from prosell.domain.repositories.branch_repository import AbstractBranchRepository


class CreateBranchUseCase:
    """Use case for creating a new branch."""

    def __init__(self, branch_repository: AbstractBranchRepository):
        """Initialize use case with branch repository."""
        self._branch_repository = branch_repository

    async def execute(self, request: CreateBranchRequest, tenant_id: uuid.UUID) -> BranchResponse:
        """
        Execute branch creation.

        Args:
            request: CreateBranchRequest with branch data
            tenant_id: Tenant UUID for multi-tenancy

        Returns:
            BranchResponse with created branch data

        Raises:
            SlugNotUnique: If slug already exists in tenant
        """
        # Generate slug from name if not provided
        slug = request.slug or self._generate_slug(request.name)

        # Validate slug uniqueness
        exists = await self._branch_repository.exists_by_slug(slug, tenant_id)
        if exists:
            raise SlugNotUniqueError(slug=slug, tenant_id=tenant_id)

        # Create branch entity (map request fields to entity fields)
        branch = Branch.create(
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

        # Persist branch
        created_branch = await self._branch_repository.create(branch)

        # Return response DTO
        return BranchResponse.from_entity(created_branch)

    def _generate_slug(self, name: str) -> str:
        """
        Generate URL-friendly slug from name.

        Simple implementation: lowercase, replace spaces with hyphens.
        TODO: Enhance with better normalization (accent removal, etc.)
        """
        return name.lower().strip().replace(" ", "-")
