"""SQLAlchemy implementations of Team and TeamMember repositories."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.team import Team, TeamMember, TeamMemberRole
from prosell.domain.repositories.team_repository import (
    AbstractTeamMemberRepository,
    AbstractTeamRepository,
)
from prosell.infrastructure.models.team_model import TeamMemberModel, TeamModel


class SqlAlchemyTeamRepository(AbstractTeamRepository):
    """SQLAlchemy implementation of TeamRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, team: Team) -> Team:
        """Create a new team."""
        model = TeamModel(
            id=team.id,
            name=team.name,
            tenant_id=team.tenant_id,
            org_id=team.org_id,
            description=team.description,
            parent_team_id=team.parent_team_id,
            created_at=team.created_at,
            updated_at=team.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, team_id: UUID, tenant_id: UUID) -> Team | None:
        """Get team by ID with tenant isolation."""
        stmt = select(TeamModel).where(
            TeamModel.id == team_id,
            TeamModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_org(
        self,
        org_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        """Get all teams for an organization."""
        stmt = (
            select(TeamModel)
            .where(
                TeamModel.org_id == org_id,
                TeamModel.tenant_id == tenant_id,
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_all(
        self,
        tenant_id: UUID | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Team]:
        """Get all teams with optional tenant filter."""
        stmt = select(TeamModel)
        if tenant_id is not None:
            stmt = stmt.where(TeamModel.tenant_id == tenant_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, team: Team) -> Team:
        """Update an existing team."""
        stmt = select(TeamModel).where(TeamModel.id == team.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Team not found: {team.id}")

        model.name = team.name
        model.description = team.description
        model.parent_team_id = team.parent_team_id
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, team_id: UUID, tenant_id: UUID) -> bool:
        """Delete a team (hard delete - members cascade)."""
        stmt = select(TeamModel).where(
            TeamModel.id == team_id,
            TeamModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def exists_by_name(self, name: str, org_id: UUID, tenant_id: UUID) -> bool:
        """Check if team with name exists in org."""
        stmt = select(func.count(TeamModel.id)).where(
            TeamModel.name == name,
            TeamModel.org_id == org_id,
            TeamModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        count: int = result.scalar() or 0
        return count > 0

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count teams."""
        stmt = select(func.count(TeamModel.id))
        if tenant_id is not None:
            stmt = stmt.where(TeamModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def count_by_org(self, org_id: UUID, tenant_id: UUID) -> int:
        """Count teams for an organization."""
        stmt = select(func.count(TeamModel.id)).where(
            TeamModel.org_id == org_id,
            TeamModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: TeamModel) -> Team:
        """Convert ORM model to domain entity."""
        return Team.model_validate(model, from_attributes=True)


class SqlAlchemyTeamMemberRepository(AbstractTeamMemberRepository):
    """SQLAlchemy implementation of TeamMemberRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, member: TeamMember) -> TeamMember:
        """Create a new team member."""
        model = TeamMemberModel(
            id=member.id,
            team_id=member.team_id,
            user_id=member.user_id,
            role=member.role.value,
            tenant_id=member.tenant_id,
            commission_rate=member.commission_rate,
            joined_at=member.joined_at,
            updated_at=member.updated_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, member_id: UUID, tenant_id: UUID) -> TeamMember | None:
        """Get team member by ID with tenant isolation."""
        stmt = select(TeamMemberModel).where(
            TeamMemberModel.id == member_id,
            TeamMemberModel.tenant_id == tenant_id,
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
    ) -> list[TeamMember]:
        """Get all members for a team."""
        stmt = (
            select(TeamMemberModel)
            .where(
                TeamMemberModel.team_id == team_id,
                TeamMemberModel.tenant_id == tenant_id,
            )
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def get_by_user(self, user_id: UUID, tenant_id: UUID) -> list[TeamMember]:
        """Get all team memberships for a user."""
        stmt = select(TeamMemberModel).where(
            TeamMemberModel.user_id == user_id,
            TeamMemberModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def update(self, member: TeamMember) -> TeamMember:
        """Update an existing team member."""
        stmt = select(TeamMemberModel).where(TeamMemberModel.id == member.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Team member not found: {member.id}")

        model.role = member.role.value
        model.commission_rate = member.commission_rate
        model.updated_at = datetime.now(UTC)

        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, member_id: UUID, tenant_id: UUID) -> bool:
        """Delete a team member."""
        stmt = select(TeamMemberModel).where(
            TeamMemberModel.id == member_id,
            TeamMemberModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def remove_from_team(self, team_id: UUID, user_id: UUID, tenant_id: UUID) -> bool:
        """Remove a user from a team."""
        stmt = select(TeamMemberModel).where(
            TeamMemberModel.team_id == team_id,
            TeamMemberModel.user_id == user_id,
            TeamMemberModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            return False

        await self.session.delete(model)
        await self.session.flush()
        return True

    async def count(self, tenant_id: UUID | None = None) -> int:
        """Count team members."""
        stmt = select(func.count(TeamMemberModel.id))
        if tenant_id is not None:
            stmt = stmt.where(TeamMemberModel.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar() or 0

    def _to_entity(self, model: TeamMemberModel) -> TeamMember:
        """Convert ORM model to domain entity."""
        return TeamMember(
            id=model.id,
            team_id=model.team_id,
            user_id=model.user_id,
            role=TeamMemberRole(model.role),
            tenant_id=model.tenant_id,
            commission_rate=model.commission_rate,
            joined_at=model.joined_at,
            updated_at=model.updated_at,
        )
