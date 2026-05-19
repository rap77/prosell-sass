"""SQLAlchemy implementation of AbstractNotificationRepository."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.notification import Notification, NotificationType
from prosell.domain.repositories.notification_repository import AbstractNotificationRepository
from prosell.infrastructure.models.notification_model import NotificationModel


class SqlAlchemyNotificationRepository(AbstractNotificationRepository):
    """SQLAlchemy implementation of AbstractNotificationRepository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _to_entity(model: NotificationModel) -> Notification:
        """Map ORM model → domain entity."""
        return Notification(
            id=model.id,
            tenant_id=model.tenant_id,
            user_id=model.user_id,
            notification_type=NotificationType(model.notification_type),
            title=model.title,
            body=model.body,
            resource_type=model.resource_type,
            resource_id=model.resource_id,
            is_read=model.is_read,
            read_at=model.read_at,
            created_at=model.created_at,
        )

    @staticmethod
    def _to_model(entity: Notification) -> NotificationModel:
        """Map domain entity → ORM model."""
        return NotificationModel(
            id=entity.id,
            tenant_id=entity.tenant_id,
            user_id=entity.user_id,
            notification_type=entity.notification_type.value,
            title=entity.title,
            body=entity.body,
            resource_type=entity.resource_type,
            resource_id=entity.resource_id,
            is_read=entity.is_read,
            read_at=entity.read_at,
            created_at=entity.created_at,
        )

    # ------------------------------------------------------------------
    # Interface implementation
    # ------------------------------------------------------------------

    async def create(self, notification: Notification) -> Notification:
        """Persist a new notification and return the saved entity."""
        model = self._to_model(notification)
        self.session.add(model)
        await self.session.flush()
        return self._to_entity(model)

    async def get_by_id(self, notification_id: UUID, tenant_id: UUID) -> Notification | None:
        """Get a notification by ID with tenant isolation."""
        stmt = select(NotificationModel).where(
            NotificationModel.id == notification_id,
            NotificationModel.tenant_id == tenant_id,
        )
        result = await self.session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_for_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
        limit: int = 20,
    ) -> list[Notification]:
        """Return the most recent notifications for a user (newest first)."""
        stmt = (
            select(NotificationModel)
            .where(
                NotificationModel.user_id == user_id,
                NotificationModel.tenant_id == tenant_id,
            )
            .order_by(NotificationModel.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def mark_as_read(
        self,
        notification_id: UUID,
        tenant_id: UUID,
        user_id: UUID,
    ) -> Notification | None:
        """Mark a single notification as read (ownership-checked)."""
        now = datetime.now(UTC)
        stmt = (
            update(NotificationModel)
            .where(
                NotificationModel.id == notification_id,
                NotificationModel.tenant_id == tenant_id,
                NotificationModel.user_id == user_id,
                NotificationModel.is_read.is_(False),
            )
            .values(is_read=True, read_at=now)
            .returning(NotificationModel)
        )
        result = await self.session.execute(stmt)
        updated = result.scalar_one_or_none()
        if updated:
            return self._to_entity(updated)
        # UPDATE matched zero rows: already read, not found, or not owned by user_id.
        # Fetch only if the notification belongs to this user to avoid data exposure.
        stmt_check = select(NotificationModel).where(
            NotificationModel.id == notification_id,
            NotificationModel.tenant_id == tenant_id,
            NotificationModel.user_id == user_id,
        )
        check_result = await self.session.execute(stmt_check)
        model = check_result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def mark_all_as_read(self, user_id: UUID, tenant_id: UUID) -> int:
        """Mark all unread notifications for a user as read.

        Returns the number of rows updated.
        """
        now = datetime.now(UTC)
        stmt = (
            update(NotificationModel)
            .where(
                NotificationModel.user_id == user_id,
                NotificationModel.tenant_id == tenant_id,
                NotificationModel.is_read.is_(False),
            )
            .values(is_read=True, read_at=now)
            .execution_options(synchronize_session=False)
        )
        result = await self.session.execute(stmt)
        return result.rowcount  # type: ignore[return-value]

    async def count_unread(self, user_id: UUID, tenant_id: UUID) -> int:
        """Return the total number of unread notifications for a user."""
        stmt = (
            select(func.count())
            .select_from(NotificationModel)
            .where(
                NotificationModel.user_id == user_id,
                NotificationModel.tenant_id == tenant_id,
                NotificationModel.is_read.is_(False),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
