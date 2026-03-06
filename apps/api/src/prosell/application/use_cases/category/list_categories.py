"""List categories use case."""

from uuid import UUID

from pydantic import BaseModel

from prosell.application.dto.category import CategoryResponse
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class CategoryListResponse(BaseModel):
    """DTO for category list response."""

    categories: list[CategoryResponse]
    total: int
    skip: int
    limit: int


class ListCategoriesUseCase:
    """List categories with optional filters."""

    def __init__(self, category_repository: AbstractCategoryRepository) -> None:
        self.category_repository = category_repository

    async def execute(
        self,
        tenant_id: UUID,
        parent_id: UUID | None = None,
        is_active: bool | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> CategoryListResponse:
        """
        Execute category listing.

        Args:
            tenant_id: Tenant UUID
            parent_id: Filter by parent (None = root categories)
            is_active: Filter by active status
            skip: Pagination offset
            limit: Max records to return

        Returns:
            CategoryListResponse DTO
        """
        # Get categories
        categories = await self.category_repository.get_all(
            tenant_id=tenant_id,
            parent_id=parent_id,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

        # Get total count
        total = await self.category_repository.count(tenant_id=tenant_id, is_active=is_active)

        return CategoryListResponse(
            categories=[CategoryResponse.from_entity(c) for c in categories],
            total=total,
            skip=skip,
            limit=limit,
        )
