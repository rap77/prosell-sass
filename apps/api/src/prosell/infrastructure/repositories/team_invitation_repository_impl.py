"""SQLAlchemy implementation of TeamInvitation repository."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.team_invitation import TeamInvitation
from prosell.domain.repositories.team_invitation_repository import (
    AbstractTeamInvitationRepository,
)
from prosell.infrastructure.models.team_model import TeamInvitationModel


class SqlAlchemyTeamInvitationRepository(AbstractTeamInvitationRepository):
    """SQLAlchemy implementation of TeamInvitationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, invitation: TeamInvitation) -> TeamInvitation:
        """Create a new team invitation."""
        model = TeamInvitationModel(
            id=invitation.id,
            team_id=invitation.team_id,
            email=invitation.email,
            role=invitation.role,
            token=invitation.token,
            expires_at=invitation.expires_at,
            status=invitation.status.value,
            tenant_id=invitation.tenant_id,
            created_at=invitation.created_at,
            updated_at=invitation.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, invitation_id: UUID, tenant_id: UUID) -> TeamInvitation | None:
        """Get invitation by ID with tenant isolation."""
        stmt = select(TeamInvitationModel).where(
            TeamInvitationModel.id == invitation_id,
            TeamInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token(self, token: str, tenant_id: UUID) -> TeamInvitation | None:
        """Get invitation by token with tenant isolation."""
        stmt = select(TeamInvitationModel).where(
            TeamInvitationModel.token == token,
            TeamInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_team(
        self,
        team_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamInvitation]:
        """Get all invitations for a team."""
        stmt = (
            select(TeamInvitationModel)
            .where(
                TeamInvitationModel.team_id == team_id,
                TeamInvitationModel.tenant_id == tenant_id,
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_email(
        self,
        email: str,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[TeamInvitation]:
        """Get all invitations for an email address."""
        stmt = (
            select(TeamInvitationModel)
            .where(
                TeamInvitationModel.email == email.lower(),
                TeamInvitationModel.tenant_id == tenant_id,
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_pending_by_team_and_email(
        self,
        team_id: UUID,
        email: str,
        tenant_id: UUID,
    ) -> TeamInvitation | None:
        """Get pending invitation for team and email."""
        stmt = select(TeamInvitationModel).where(
            TeamInvitationModel.team_id == team_id,
            TeamInvitationModel.email == email.lower(),
            TeamInvitationModel.tenant_id == tenant_id,
            TeamInvitationModel.status == "pending",
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, invitation: TeamInvitation) -> TeamInvitation:
        """Update an existing invitation."""
        stmt = select(TeamInvitationModel).where(TeamInvitationModel.id == invitation.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Invitation not found: {invitation.id}")

        model.status = invitation.status.value
        model.updated_at = invitation.updated_at

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, invitation_id: UUID, tenant_id: UUID) -> bool:
        """Delete an invitation."""
        stmt = select(TeamInvitationModel).where(
            TeamInvitationModel.id == invitation_id,
            TeamInvitationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count total invitations."""
        from sqlalchemy import func

        stmt = select(func.count(TeamInvitationModel.id))
        if tenant_id is not None:
            stmt = stmt.where(TeamInvitationModel.tenant_id == tenant_id)

        result = await self.session.execute(stmt)
        return result.scalar_one()

    def _to_entity(self, model: TeamInvitationModel) -> TeamInvitation:
        """Convert ORM model to domain entity."""
        from prosell.domain.entities.team_invitation import TeamInvitationStatus

        return TeamInvitation(
            id=model.id,
            team_id=model.team_id,
            email=model.email,
            role=model.role,
            token=model.token,
            expires_at=model.expires_at,
            status=TeamInvitationStatus(model.status),
            tenant_id=model.tenant_id,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
