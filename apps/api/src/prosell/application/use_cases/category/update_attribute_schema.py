"""Update category attribute schema use case."""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from prosell.application.dto.category.response import CategoryResponse
from prosell.application.use_cases.category._authz import (
    _require_platform_admin_for_global,
)
from prosell.domain.repositories.category_repository import AbstractCategoryRepository

logger = logging.getLogger(__name__)


class UpdateCategoryAttributeSchemaUseCase:
    """
    Replace the attribute_schema on a category.

    Resolves the category via repo.get_by_id_or_global (global templates +
    caller's own); the router gates this to the ProSell super_admin.
    Logs a warning when replacing a non-empty schema to alert about
    potential attribute invalidation on existing products.
    """

    def __init__(self, repo: AbstractCategoryRepository) -> None:
        self.repo = repo

    async def execute(
        self,
        category_id: UUID,
        tenant_id: UUID,
        attribute_schema: dict[str, Any],
        is_platform_admin: bool = False,
    ) -> CategoryResponse:
        """
        Replace category's attribute_schema.

        Args:
            category_id: UUID of category to update
            tenant_id: Caller's tenant — resolves global templates + own
                       categories; another tenant's private category is denied.
            attribute_schema: New schema to set (REPLACE semantics, not merge)
            is_platform_admin: Required to edit a GLOBAL template's schema
                (defense in depth). Defaults to False (safe).

        Returns:
            Updated CategoryResponse

        Raises:
            HTTPException 403: If editing a global template without platform admin
            HTTPException 404: If category not found or access denied
        """
        category = await self.repo.get_by_id_or_global(category_id, tenant_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        _require_platform_admin_for_global(category.tenant_id, is_platform_admin)

        # Log warning if replacing non-empty schema — existing products may become invalid
        if category.attribute_schema:
            logger.warning(
                "Replacing non-empty attribute_schema for category %s (tenant %s). "
                "Existing products with attributes may become invalid.",
                category_id,
                tenant_id,
            )

        category.attribute_schema = attribute_schema
        category.updated_at = datetime.now(UTC)
        category = await self.repo.update(category)
        return CategoryResponse.from_entity(category)
