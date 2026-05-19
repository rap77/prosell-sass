"""Notification router — endpoints for in-app notification management."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.domain.entities.notification import NotificationType
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.notification_repository_impl import (
    SqlAlchemyNotificationRepository,
)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================


class NotificationResponse(BaseModel):
    """Notification response schema."""

    id: UUID
    notification_type: NotificationType
    title: str
    body: str
    resource_type: str | None
    resource_id: UUID | None
    is_read: bool
    read_at: str | None
    created_at: str

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Paginated notification list response."""

    items: list[NotificationResponse]
    unread_count: int


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


async def get_notification_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyNotificationRepository:
    """Get notification repository instance."""
    return SqlAlchemyNotificationRepository(session)


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    summary="List notifications for current user",
)
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    repo: Annotated[SqlAlchemyNotificationRepository, Depends(get_notification_repository)],
) -> NotificationListResponse:
    """Return the last 20 notifications for the authenticated user."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    notifications = await repo.list_for_user(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        limit=20,
    )
    unread_count = await repo.count_unread(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )
    items = [
        NotificationResponse(
            id=n.id,
            notification_type=n.notification_type,
            title=n.title,
            body=n.body,
            resource_type=n.resource_type,
            resource_id=n.resource_id,
            is_read=n.is_read,
            read_at=n.read_at.isoformat() if n.read_at else None,
            created_at=n.created_at.isoformat(),
        )
        for n in notifications
    ]
    return NotificationListResponse(items=items, unread_count=unread_count)


@router.put(
    "/notifications/read-all",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark all notifications as read",
)
async def mark_all_notifications_read(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    repo: Annotated[SqlAlchemyNotificationRepository, Depends(get_notification_repository)],
) -> None:
    """Mark all unread notifications for the current user as read."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    await repo.mark_all_as_read(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )


@router.put(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    repo: Annotated[SqlAlchemyNotificationRepository, Depends(get_notification_repository)],
) -> NotificationResponse:
    """Mark a single notification as read."""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    notification = await repo.mark_as_read(
        notification_id=notification_id,
        tenant_id=current_user.tenant_id,
    )
    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationResponse(
        id=notification.id,
        notification_type=notification.notification_type,
        title=notification.title,
        body=notification.body,
        resource_type=notification.resource_type,
        resource_id=notification.resource_id,
        is_read=notification.is_read,
        read_at=notification.read_at.isoformat() if notification.read_at else None,
        created_at=notification.created_at.isoformat(),
    )
