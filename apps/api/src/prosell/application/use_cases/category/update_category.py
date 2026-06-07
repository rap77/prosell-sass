"""Update category use case."""

from uuid import UUID

from fastapi import HTTPException

from prosell.application.dto.category.response import CategoryResponse
from prosell.application.dto.category.update import UpdateCategoryRequest
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class UpdateCategoryUseCase:
    """Update basic category information."""

    def __init__(self, repo: AbstractCategoryRepository) -> None:
        self.repo = repo

    async def execute(
        self,
        category_id: UUID,
        tenant_id: UUID,
        request: UpdateCategoryRequest,
    ) -> CategoryResponse:
        """
        Update category basic info.

        Args:
            category_id: UUID of category to update
            tenant_id: Tenant UUID for isolation
            request: UpdateCategoryRequest DTO (all fields optional)

        Returns:
            Updated CategoryResponse

        Raises:
            HTTPException 404: If category not found
        """
        # Global templates (tenant NULL) + caller's own. Router gates to super_admin.
        category = await self.repo.get_by_id_or_global(category_id, tenant_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        # Update basic info (only provided fields)
        category.update_basic_info(
            name=request.name,
            slug=request.slug,
            description=request.description,
            icon=request.icon,
            image_url=request.image_url,
        )

        # Handle activation state
        if request.is_active is True:
            category.activate()
        elif request.is_active is False:
            category.deactivate()

        # Handle sort order
        if request.sort_order is not None:
            category.set_sort_order(request.sort_order)

        category = await self.repo.update(category)
        return CategoryResponse.from_entity(category)
