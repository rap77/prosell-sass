"""SQLAlchemy adapter for the product_ownership M2M bridge.

Supports multi-owner products with percentage shares. Uses upsert for
idempotent add_owner when the same owner is added twice.
"""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.repositories.product_ownership_repository import ProductOwner
from prosell.infrastructure.models.product_ownership_model import ProductOwnershipModel


class SqlAlchemyProductOwnershipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add_owner(self, product_id: UUID, owner_id: UUID, percentage: Decimal) -> None:
        stmt = (
            pg_insert(ProductOwnershipModel)
            .values(
                product_id=product_id,
                owner_id=owner_id,
                percentage=percentage,
            )
            .on_conflict_do_update(
                index_elements=["product_id", "owner_id"],
                set_={"percentage": percentage},
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def list_owners(self, product_id: UUID) -> list[ProductOwner]:
        stmt = select(ProductOwnershipModel).where(ProductOwnershipModel.product_id == product_id)
        result = await self.session.execute(stmt)
        return [
            ProductOwner(
                product_id=row.product_id,
                owner_id=row.owner_id,
                percentage=row.percentage,
                created_at=row.created_at,
            )
            for row in result.scalars().all()
        ]

    async def update_percentage(
        self, product_id: UUID, owner_id: UUID, percentage: Decimal
    ) -> None:
        stmt = (
            update(ProductOwnershipModel)
            .where(
                ProductOwnershipModel.product_id == product_id,
                ProductOwnershipModel.owner_id == owner_id,
            )
            .values(percentage=percentage)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def remove_owner(self, product_id: UUID, owner_id: UUID) -> None:
        stmt = delete(ProductOwnershipModel).where(
            ProductOwnershipModel.product_id == product_id,
            ProductOwnershipModel.owner_id == owner_id,
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def get_total_percentage(self, product_id: UUID) -> Decimal:
        stmt = select(func.sum(ProductOwnershipModel.percentage)).where(
            ProductOwnershipModel.product_id == product_id
        )
        result = await self.session.execute(stmt)
        total = result.scalar()
        return total if total is not None else Decimal("0")

    async def clear_ownership(self, product_id: UUID) -> None:
        stmt = delete(ProductOwnershipModel).where(ProductOwnershipModel.product_id == product_id)
        await self.session.execute(stmt)
        await self.session.flush()
