"""SQLAlchemy implementation of Session repository."""

import hashlib
from datetime import UTC
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.session import Session
from prosell.domain.repositories.session_repository import AbstractSessionRepository
from prosell.infrastructure.models.session_model import SessionModel


def hash_token(token: str) -> str:
    """Hash a token for storage."""
    return hashlib.sha256(token.encode()).hexdigest()


class SqlAlchemySessionRepository(AbstractSessionRepository):
    """SQLAlchemy implementation of SessionRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, session: Session) -> Session:
        """Create a new session."""
        model = SessionModel(
            id=session.id,
            user_id=session.user_id,
            token_hash=session.token_hash,
            user_agent=session.user_agent,
            ip_address=session.ip_address,
            expires_at=session.expires_at,
            revoked_at=session.revoked_at,
            created_at=session.created_at,
        )
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, session_id: UUID) -> Session | None:
        """Get session by ID."""
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_token_hash(self, token_hash: str) -> Session | None:
        """Get session by token hash."""
        stmt = select(SessionModel).where(SessionModel.token_hash == token_hash)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def update(self, session: Session) -> Session:
        """Update session."""
        stmt = select(SessionModel).where(SessionModel.id == session.id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if not model:
            raise ValueError(f"Session not found: {session.id}")

        model.revoked_at = session.revoked_at
        await self.session.flush()
        return self._to_entity(model)

    async def delete(self, session_id: UUID) -> None:
        """Delete session."""
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()

        if model:
            await self.session.delete(model)
            await self.session.flush()

    async def revoke_all_user_sessions(self, user_id: UUID) -> None:
        """Revoke all sessions for a user."""
        from datetime import datetime

        stmt = select(SessionModel).where(
            SessionModel.user_id == user_id,
            SessionModel.revoked_at.is_(None),
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        for model in models:
            model.revoked_at = datetime.now(UTC)

        await self.session.flush()

    async def delete_expired_sessions(self) -> int:
        """Delete all expired sessions."""
        from datetime import datetime

        stmt = select(SessionModel).where(
            SessionModel.expires_at < datetime.now(UTC),
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()

        count = len(models)
        for model in models:
            await self.session.delete(model)

        await self.session.flush()
        return count

    async def list_user_sessions(
        self,
        user_id: UUID,
        active_only: bool = True,
    ) -> list[Session]:
        """List all sessions for a user."""
        from datetime import datetime

        stmt = select(SessionModel).where(SessionModel.user_id == user_id)

        if active_only:
            stmt = stmt.where(
                and_(
                    SessionModel.revoked_at.is_(None),
                    SessionModel.expires_at > datetime.now(UTC),
                ),
            )

        stmt = stmt.order_by(SessionModel.created_at.desc())
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(model) for model in models]

    def _to_entity(self, model: SessionModel) -> Session:
        """Convert ORM model to domain entity."""
        return Session(
            id=model.id,
            user_id=model.user_id,
            token_hash=model.token_hash,
            user_agent=model.user_agent,
            ip_address=model.ip_address,
            expires_at=model.expires_at,
            revoked_at=model.revoked_at,
            created_at=model.created_at,
        )
