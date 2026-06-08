"""SQLAlchemy adapter for the organization_vertical M2M bridge.

Idempotency is implemented with `pg_insert(...).on_conflict_do_nothing()`
which emits `INSERT ... ON CONFLICT DO NOTHING` at the SQL level — the
composite primary key (organization_id, root_category_id) is the
conflict target, so a second `enable()` for the same pair is a no-op
rather than a unique-violation error.
"""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.infrastructure.models.organization_vertical_model import (
    OrganizationVerticalModel,
)


class SqlAlchemyOrganizationVerticalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def enable(self, organization_id: UUID, root_category_id: UUID) -> None:
        stmt = (
            pg_insert(OrganizationVerticalModel)
            .values(
                organization_id=organization_id,
                root_category_id=root_category_id,
            )
            .on_conflict_do_nothing()
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def list_root_category_ids(self, organization_id: UUID) -> list[UUID]:
        stmt = select(OrganizationVerticalModel.root_category_id).where(
            OrganizationVerticalModel.organization_id == organization_id
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
