"""SQLAlchemy implementation of AbstractCategorySchemaRepository."""

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import insert, text
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.repositories.category_schema_repository import (
    AbstractCategorySchemaRepository,
)
from prosell.infrastructure.models.category_schema_change_model import (
    CategorySchemaChangeModel,
)


class SqlAlchemyCategorySchemaRepository(AbstractCategorySchemaRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def count_products_with_attribute(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> int:
        result = await self._session.execute(
            text(
                "SELECT COUNT(*) FROM products "
                "WHERE category_id = :cid AND tenant_id = :tid AND attributes ? :fname"
            ).bindparams(cid=category_id, tid=tenant_id, fname=field_name)
        )
        return result.scalar() or 0

    async def count_products_missing_attribute(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> int:
        result = await self._session.execute(
            text(
                "SELECT COUNT(*) FROM products "
                "WHERE category_id = :cid AND tenant_id = :tid AND NOT (attributes ? :fname)"
            ).bindparams(cid=category_id, tid=tenant_id, fname=field_name)
        )
        return result.scalar() or 0

    async def migrate_attribute_to_string(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> None:
        await self._session.execute(
            text(
                "UPDATE products "
                "SET attributes = jsonb_set(attributes, ARRAY[:fname], "
                "to_jsonb((attributes->>:fname)::text)) "
                "WHERE category_id = :cid AND tenant_id = :tid AND attributes ? :fname"
            ).bindparams(fname=field_name, cid=category_id, tid=tenant_id)
        )

    async def migrate_attribute_to_number(
        self, category_id: UUID, tenant_id: UUID, field_name: str
    ) -> None:
        await self._session.execute(
            text(
                "UPDATE products "
                "SET attributes = jsonb_set(attributes, ARRAY[:fname], "
                "to_jsonb((attributes->>:fname)::numeric)) "
                "WHERE category_id = :cid AND tenant_id = :tid AND attributes ? :fname "
                "AND (attributes->>:fname) ~ '^[0-9]+(\\.[0-9]+)?$'"
            ).bindparams(fname=field_name, cid=category_id, tid=tenant_id)
        )

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
        await self._session.execute(
            insert(CategorySchemaChangeModel).values(
                id=uuid4(),
                category_id=category_id,
                changed_by_user_id=changed_by_user_id,
                changed_at=changed_at,
                previous_attributes=previous_attributes,
                new_attributes=new_attributes,
                migration_applied=migration_applied,
                migration_warnings=migration_warnings,
                change_summary=change_summary,
            )
        )
