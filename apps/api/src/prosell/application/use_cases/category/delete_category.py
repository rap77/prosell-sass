"""Delete category use case (soft delete via deactivation)."""

from uuid import UUID

from fastapi import HTTPException

from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class DeleteCategoryUseCase:
    """
    Soft-delete a category by deactivating it.

    Hard delete is out of scope — deactivation avoids FK violations from
    existing products referencing this category.
    """

    def __init__(self, repo: AbstractCategoryRepository) -> None:
        self.repo = repo

    async def execute(self, category_id: UUID, tenant_id: UUID) -> None:
        """
        Soft-delete a category (sets is_active=False).

        Args:
            category_id: UUID of category to delete
            tenant_id: Tenant UUID for isolation

        Raises:
            HTTPException 404: If category not found
        """
        category = await self.repo.get_by_id(category_id, tenant_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        category.deactivate()
        await self.repo.update(category)
