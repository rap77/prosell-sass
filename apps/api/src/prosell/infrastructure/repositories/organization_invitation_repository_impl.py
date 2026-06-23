"""SQLAlchemy implementation of OrganizationInvitation repository."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.organization_invitation import (
    OrganizationInvitation,
    OrganizationInvitationStatus,
)
from prosell.domain.repositories.organization_invitation_repository import (
    AbstractOrganizationInvitationRepository,
)
from prosell.infrastructure.models.organization_model import OrganizationInvitationModel


class SqlAlchemyOrganizationInvitationRepository(AbstractOrganizationInvitationRepository):
    """SQLAlchemy implementation of OrganizationInvitationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        model = OrganizationInvitationModel(
            id=invitation.id,
            organization_id=invitation.organization_id,
            email=invitation.email,
            token=invitation.token,
            expires_at=invitation.expires_at,
            status=invitation.status.value,
            tenant_id=invitation.tenant_id,
            created_by_user_id=invitation.created_by_user_id,
            accepted_by_user_id=invitation.accepted_by_user_id,
            created_at=invitation.created_at,
            updated_at=invitation.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(
        self, invitation_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.id == invitation_id,
            OrganizationInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token(self, token: str, tenant_id: UUID) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.token == token,
            OrganizationInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token_unscoped(self, token: str) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(OrganizationInvitationModel.token == token)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_pending_by_org_and_email(
        self, organization_id: UUID, email: str, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.organization_id == organization_id,
            OrganizationInvitationModel.email == email.lower(),
            OrganizationInvitationModel.tenant_id == tenant_id,
            OrganizationInvitationModel.status == "pending",
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_latest_by_organization(
        self, organization_id: UUID, tenant_id: UUID
    ) -> OrganizationInvitation | None:
        stmt = (
            select(OrganizationInvitationModel)
            .where(
                OrganizationInvitationModel.organization_id == organization_id,
                OrganizationInvitationModel.tenant_id == tenant_id,
            )
            .order_by(OrganizationInvitationModel.created_at.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, invitation: OrganizationInvitation) -> OrganizationInvitation:
        stmt = select(OrganizationInvitationModel).where(
            OrganizationInvitationModel.id == invitation.id
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Invitation not found: {invitation.id}")

        # token/expires_at must be persisted too -- regenerate_token() (the
        # resend/reuse path) mutates both, and an update() that drops them
        # would email a raw token whose hash never matches the stored row.
        model.token = invitation.token
        model.expires_at = invitation.expires_at
        model.status = invitation.status.value
        model.accepted_by_user_id = invitation.accepted_by_user_id
        model.updated_at = invitation.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def count(self, tenant_id: UUID | None = None) -> int:
        stmt = select(func.count(OrganizationInvitationModel.id))
        if tenant_id is not None:
            stmt = stmt.where(OrganizationInvitationModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    def _to_entity(self, model: OrganizationInvitationModel) -> OrganizationInvitation:
        return OrganizationInvitation(
            id=model.id,
            organization_id=model.organization_id,
            email=model.email,
            token=model.token,
            expires_at=model.expires_at,
            status=OrganizationInvitationStatus(model.status),
            tenant_id=model.tenant_id,
            created_by_user_id=model.created_by_user_id,
            accepted_by_user_id=model.accepted_by_user_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
