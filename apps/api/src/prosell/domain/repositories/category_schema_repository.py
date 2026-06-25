"""Abstract repository for category schema operations (counts, migrations, audit log)."""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any
from uuid import UUID


class AbstractCategorySchemaRepository(ABC):
    """Port for schema-related persistence operations.

    Separated from AbstractCategoryRepository because these operations
    involve cross-table queries (products, category_schema_changes) that
    don't belong on the main category aggregate port.
    """

    @abstractmethod
    async def count_products_with_attribute(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> int:
        """Count products for tenant in category that have the given attribute key."""

    @abstractmethod
    async def count_products_missing_attribute(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> int:
        """Count products for tenant in category that lack the given attribute key."""

    @abstractmethod
    async def migrate_attribute_to_string(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> None:
        """Cast attribute values to text string for tenant's products in category."""

    @abstractmethod
    async def migrate_attribute_to_number(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> None:
        """Cast attribute values to numeric for tenant's parseable rows in category."""

    @abstractmethod
    async def save_schema_change(
        self,
        *,
        category_id: UUID,
        changed_by_user_id: UUID,
        changed_at: datetime,
        previous_attributes: dict[str, Any] | None,
        new_attributes: dict[str, Any],
        migration_applied: bool,
        migration_warnings: list[str],
        change_summary: str,
    ) -> None:
        """Persist a schema change audit log entry."""
