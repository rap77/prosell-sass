"""Delete category use case (soft delete via deactivation)."""

from uuid import UUID

from fastapi import HTTPException

from prosell.application.use_cases.category._authz import (
    _require_platform_admin_for_global,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository


class DeleteCategoryUseCase:
    """
    Soft-delete a category by deactivating it.

    Hard delete is out of scope — deactivation avoids FK violations from
    existing products referencing this category.
    """

    def __init__(self, repo: AbstractCategoryRepository) -> None:
        self.repo = repo

    async def execute(
        self, category_id: UUID, tenant_id: UUID, is_platform_admin: bool = False
    ) -> None:
        """
        Soft-delete a category (sets is_active=False).

        Args:
            category_id: UUID of category to delete
            tenant_id: Tenant UUID for isolation
            is_platform_admin: Required to soft-delete a GLOBAL template
                (defense in depth). Defaults to False (safe).

        Raises:
            HTTPException 403: If deleting a global template without platform admin
            HTTPException 404: If category not found
        """
        # Global templates (tenant NULL) + caller's own; never another tenant's
        # private category.
        category = await self.repo.get_by_id_or_global(category_id, tenant_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        _require_platform_admin_for_global(category.tenant_id, is_platform_admin)

        category.deactivate()
        await self.repo.update(category)
