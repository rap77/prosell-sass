"""SQLAlchemy implementation of Organization repository."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization import Organization
from prosell.domain.repositories.organization_repository import AbstractOrganizationRepository
from prosell.domain.value_objects.organization_status import OrganizationStatus
from prosell.infrastructure.models.organization_model import OrganizationModel


class SqlAlchemyOrganizationRepository(AbstractOrganizationRepository):
    """SQLAlchemy implementation of OrganizationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, organization: Organization) -> Organization:
        """Create a new organization."""
        model = OrganizationModel(
            id=organization.id,
            name=organization.name,
            code=organization.code,
            color=organization.color,
            tenant_id=organization.tenant_id,
            logo_url=organization.logo_url,
            banner_url=organization.banner_url,
            description=organization.description,
            website=organization.website,
            phone=organization.phone,
            email=organization.email,
            whatsapp=organization.whatsapp,
            street_address=organization.street_address,
            city=organization.city,
            state=organization.state,
            postal_code=organization.postal_code,
            country=organization.country,
            tax_id=organization.tax_id,
            instagram=organization.instagram,
            facebook=organization.facebook,
            status=organization.status.value,
            verified_at=organization.verified_at,
            verified_by=organization.verified_by,
            wallet_id=organization.wallet_id,
            created_by_user_id=organization.created_by_user_id,
            settings=organization.settings,
            created_at=organization.created_at,
            updated_at=organization.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, org_id: UUID, tenant_id: UUID) -> Organization | None:
        """Get organization by ID with tenant isolation."""
        stmt = select(OrganizationModel).where(
            OrganizationModel.id == org_id,
            OrganizationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_tenant_id(self, tenant_id: UUID) -> Organization | None:
        """Get organization by tenant ID."""
        stmt = select(OrganizationModel).where(
            OrganizationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Organization]:
        """Get all organizations with optional tenant filter."""
        stmt = select(OrganizationModel)
        if tenant_id is not None:
            stmt = stmt.where(OrganizationModel.tenant_id == tenant_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, organization: Organization) -> Organization:
        """Update an existing organization."""
        stmt = select(OrganizationModel).where(
            OrganizationModel.id == organization.id,
            OrganizationModel.tenant_id == organization.tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Organization not found: {organization.id}")

        model.name = organization.name
        model.code = organization.code
        model.color = organization.color
        model.logo_url = organization.logo_url
        model.banner_url = organization.banner_url
        model.description = organization.description
        model.website = organization.website
        model.phone = organization.phone
        model.email = organization.email
        model.whatsapp = organization.whatsapp
        model.street_address = organization.street_address
        model.city = organization.city
        model.state = organization.state
        model.postal_code = organization.postal_code
        model.country = organization.country
        model.tax_id = organization.tax_id
        model.instagram = organization.instagram
        model.facebook = organization.facebook
        model.status = organization.status.value
        model.verified_at = organization.verified_at
        model.verified_by = organization.verified_by
        model.wallet_id = organization.wallet_id
        model.setup_complete = organization.setup_complete
        model.settings = organization.settings
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, org_id: UUID, tenant_id: UUID) -> bool:
        """Delete an organization (soft delete via status)."""
        stmt = select(OrganizationModel).where(
            OrganizationModel.id == org_id,
            OrganizationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        model.status = OrganizationStatus.SUSPENDED.value
        model.updated_at = datetime.now(UTC)
        await self.session.flush()
        return True

    async def exists_by_name(self, name: str, tenant_id: UUID) -> bool:
        """Check if organization with name exists."""
        stmt = select(func.count(OrganizationModel.id)).where(
            OrganizationModel.name == name,
            OrganizationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count organizations."""
        stmt = select(func.count(OrganizationModel.id))
        if tenant_id is not None:
            stmt = stmt.where(OrganizationModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: OrganizationModel) -> Organization:
        """Convert ORM model to domain entity."""
        return Organization.model_validate(model, from_attributes=True)
