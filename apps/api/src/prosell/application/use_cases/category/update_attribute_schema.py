"""Update category attribute schema use case."""

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from prosell.application.dto.category.response import CategoryResponse
from prosell.domain.repositories.category_repository import AbstractCategoryRepository

logger = logging.getLogger(__name__)


class UpdateCategoryAttributeSchemaUseCase:
    """
    Replace the attribute_schema on a category.

    Tenant isolation is enforced here via repo.get_by_id(id, tenant_id).
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
    ) -> CategoryResponse:
        """
        Replace category's attribute_schema.

        Args:
            category_id: UUID of category to update
            tenant_id: Tenant UUID — get_by_id filters by both id AND tenant_id,
                       so a None return means either not found OR wrong tenant (access denied).
            attribute_schema: New schema to set (REPLACE semantics, not merge)

        Returns:
            Updated CategoryResponse

        Raises:
            HTTPException 404: If category not found or access denied
        """
        # tenant_id enforced here: get_by_id already filters by tenant_id
        category = await self.repo.get_by_id(category_id, tenant_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

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
