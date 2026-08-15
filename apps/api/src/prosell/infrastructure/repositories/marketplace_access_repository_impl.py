"""SQLAlchemy implementation of marketplace access repository."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.marketplace_access import MarketplaceAccessGrant
from prosell.domain.repositories.marketplace_access_repository import (
    AbstractMarketplaceAccessRepository,
)
from prosell.domain.value_objects.marketplace_access_status import MarketplaceAccessStatus
from prosell.infrastructure.models.organization_marketplace_access_model import (
    OrganizationMarketplaceAccessModel,
)


class SqlAlchemyMarketplaceAccessRepository(AbstractMarketplaceAccessRepository):
    """SQLAlchemy implementation."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, grant_id: UUID) -> MarketplaceAccessGrant | None:
        model = await self.session.get(OrganizationMarketplaceAccessModel, grant_id)
        return self._to_entity(model) if model else None

    async def get_by_orgs(
        self, inventory_owner_id: UUID, operator_id: UUID
    ) -> MarketplaceAccessGrant | None:
        result = await self.session.execute(
            select(OrganizationMarketplaceAccessModel).where(
                OrganizationMarketplaceAccessModel.inventory_owner_organization_id
                == inventory_owner_id,
                OrganizationMarketplaceAccessModel.operator_organization_id == operator_id,
            )
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def create(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        model = self._to_model(grant)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def update(self, grant: MarketplaceAccessGrant) -> MarketplaceAccessGrant:
        stmt = select(OrganizationMarketplaceAccessModel).where(
            OrganizationMarketplaceAccessModel.id == grant.id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Grant not found: {grant.id}")

        # Update fields from entity
        model.inventory_owner_organization_id = grant.inventory_owner_organization_id
        model.operator_organization_id = grant.operator_organization_id
        model.can_publish_marketplace = grant.can_publish_marketplace
        model.can_manage_inventory = grant.can_manage_inventory
        model.status = grant.status.value
        model.requested_by_user_id = grant.requested_by_user_id
        model.approved_by_user_id = grant.approved_by_user_id
        model.rejected_by_user_id = grant.rejected_by_user_id
        model.revoked_by_user_id = grant.revoked_by_user_id
        model.requested_at = grant.requested_at
        model.approved_at = grant.approved_at
        model.rejected_at = grant.rejected_at
        model.revoked_at = grant.revoked_at
        model.rejection_reason = grant.rejection_reason
        model.revocation_reason = grant.revocation_reason
        model.updated_at = grant.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def list_by_inventory_owner(
        self, inventory_owner_id: UUID
    ) -> list[MarketplaceAccessGrant]:
        result = await self.session.execute(
            select(OrganizationMarketplaceAccessModel).where(
                OrganizationMarketplaceAccessModel.inventory_owner_organization_id
                == inventory_owner_id
            )
        )
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    async def list_by_operator(self, operator_id: UUID) -> list[MarketplaceAccessGrant]:
        result = await self.session.execute(
            select(OrganizationMarketplaceAccessModel).where(
                OrganizationMarketplaceAccessModel.operator_organization_id == operator_id
            )
        )
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    def _to_entity(self, model: OrganizationMarketplaceAccessModel) -> MarketplaceAccessGrant:
        """Convert ORM model to domain entity."""
        return MarketplaceAccessGrant(
            id=model.id,
            inventory_owner_organization_id=model.inventory_owner_organization_id,
            operator_organization_id=model.operator_organization_id,
            can_publish_marketplace=model.can_publish_marketplace,
            can_manage_inventory=model.can_manage_inventory,
            status=MarketplaceAccessStatus(model.status),
            requested_by_user_id=model.requested_by_user_id,
            approved_by_user_id=model.approved_by_user_id,
            rejected_by_user_id=model.rejected_by_user_id,
            revoked_by_user_id=model.revoked_by_user_id,
            requested_at=model.requested_at,
            approved_at=model.approved_at,
            rejected_at=model.rejected_at,
            revoked_at=model.revoked_at,
            rejection_reason=model.rejection_reason,
            revocation_reason=model.revocation_reason,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: MarketplaceAccessGrant) -> OrganizationMarketplaceAccessModel:
        """Convert domain entity to ORM model."""
        return OrganizationMarketplaceAccessModel(
            id=entity.id,
            inventory_owner_organization_id=entity.inventory_owner_organization_id,
            operator_organization_id=entity.operator_organization_id,
            can_publish_marketplace=entity.can_publish_marketplace,
            can_manage_inventory=entity.can_manage_inventory,
            status=entity.status.value,
            requested_by_user_id=entity.requested_by_user_id,
            approved_by_user_id=entity.approved_by_user_id,
            rejected_by_user_id=entity.rejected_by_user_id,
            revoked_by_user_id=entity.revoked_by_user_id,
            requested_at=entity.requested_at,
            approved_at=entity.approved_at,
            rejected_at=entity.rejected_at,
            revoked_at=entity.revoked_at,
            rejection_reason=entity.rejection_reason,
            revocation_reason=entity.revocation_reason,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
