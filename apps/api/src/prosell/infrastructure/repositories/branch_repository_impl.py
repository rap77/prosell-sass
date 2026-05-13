"""SqlAlchemyBranchRepository implementation."""

import json
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.branch import Branch
from prosell.domain.repositories.branch_repository import AbstractBranchRepository
from prosell.infrastructure.models.branch_model import BranchModel


class SqlAlchemyBranchRepository(AbstractBranchRepository):
    """SQLAlchemy implementation of AbstractBranchRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, branch: Branch) -> Branch:
        """Create a new branch."""
        model = self._to_model(branch)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, branch_id: UUID, tenant_id: UUID | None = None) -> Branch | None:
        """Get branch by ID with optional tenant isolation."""
        conditions = [BranchModel.id == branch_id]
        if tenant_id is not None:
            conditions.append(BranchModel.tenant_id == tenant_id)
        stmt = select(BranchModel).where(*conditions)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_slug(self, slug: str, tenant_id: UUID) -> Branch | None:
        """Get branch by slug (unique per tenant)."""
        stmt = select(BranchModel).where(
            BranchModel.slug == slug,
            BranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def exists_by_slug(self, slug: str, tenant_id: UUID) -> bool:
        """Check if slug exists (for validation)."""
        stmt = select(func.count(BranchModel.id)).where(
            BranchModel.slug == slug,
            BranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def update(self, branch: Branch) -> Branch:
        """Update an existing branch."""
        stmt = select(BranchModel).where(
            BranchModel.id == branch.id,
            BranchModel.tenant_id == branch.tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError

            raise BranchNotFoundError(branch_id=branch.id)

        # Update fields
        model.name = branch.name
        model.slug = branch.slug
        model.location_address = branch.location_address
        model.location_city = branch.location_city
        model.location_state = branch.location_state
        model.location_zip = branch.location_zip
        model.location_lat = branch.location_lat
        model.location_lng = branch.location_lng
        model.timezone = branch.timezone
        model.settings = json.dumps(branch.settings) if branch.settings else None
        model.updated_at = branch.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, branch_id: UUID, tenant_id: UUID) -> None:
        """Delete a branch by ID."""
        stmt = select(BranchModel).where(
            BranchModel.id == branch_id,
            BranchModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            from prosell.domain.exceptions.branch_exceptions import BranchNotFoundError

            raise BranchNotFoundError(branch_id=branch_id)

        await self.session.delete(model)

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Branch], int]:
        """List branches for a tenant with pagination. Returns (branches, total)."""
        from sqlalchemy import func

        count_stmt = select(func.count(BranchModel.id)).where(BranchModel.tenant_id == tenant_id)
        count_result = await self.session.execute(count_stmt)
        total: int = count_result.scalar() or 0

        stmt = (
            select(BranchModel)
            .where(BranchModel.tenant_id == tenant_id)
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models], total

    def _to_entity(self, model: BranchModel) -> Branch:
        """Convert ORM model to domain entity."""
        settings: dict[str, object] = {}
        if model.settings:
            try:
                parsed = json.loads(model.settings)
                if isinstance(parsed, dict):
                    settings = parsed
            except (json.JSONDecodeError, TypeError):
                pass
        return Branch(
            id=model.id,
            tenant_id=model.tenant_id,
            name=model.name,
            slug=model.slug,
            location_address=model.location_address,
            location_city=model.location_city,
            location_state=model.location_state,
            location_zip=model.location_zip,
            location_lat=model.location_lat,
            location_lng=model.location_lng,
            timezone=model.timezone,
            settings=settings,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, branch: Branch) -> BranchModel:
        """Convert domain entity to ORM model."""
        return BranchModel(
            id=branch.id,
            tenant_id=branch.tenant_id,
            name=branch.name,
            slug=branch.slug,
            location_address=branch.location_address,
            location_city=branch.location_city,
            location_state=branch.location_state,
            location_zip=branch.location_zip,
            location_lat=branch.location_lat,
            location_lng=branch.location_lng,
            timezone=branch.timezone,
            settings=json.dumps(branch.settings) if branch.settings else None,
            created_at=branch.created_at,
            updated_at=branch.updated_at,
        )
