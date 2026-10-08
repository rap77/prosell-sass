"""Push subscription router — endpoints for Web Push subscription management.

CRM roadmap Fase 5 delivery channel.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from prosell.application.use_cases.push.subscribe_to_push import SubscribeToPushUseCase
from prosell.application.use_cases.push.unsubscribe_from_push import UnsubscribeFromPushUseCase
from prosell.core.config import settings
from prosell.domain.entities.user import User
from prosell.infrastructure.api.dependencies import get_current_auth_user_from_cookie
from prosell.infrastructure.database.session import get_async_session
from prosell.infrastructure.repositories.push_subscription_repository_impl import (
    SqlAlchemyPushSubscriptionRepository,
)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================


class PushSubscriptionKeys(BaseModel):
    """Web Push API's standard subscription keys shape."""

    p256dh: str
    auth: str


class SubscribeRequest(BaseModel):
    """Body for POST /push/subscribe — mirrors PushSubscription.toJSON()."""

    endpoint: str
    keys: PushSubscriptionKeys


class UnsubscribeRequest(BaseModel):
    """Body for DELETE /push/subscribe."""

    endpoint: str


class VapidPublicKeyResponse(BaseModel):
    """Response for GET /push/vapid-public-key."""

    public_key: str


# =============================================================================
# DEPENDENCY FACTORIES
# =============================================================================


async def get_push_subscription_repository(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> SqlAlchemyPushSubscriptionRepository:
    return SqlAlchemyPushSubscriptionRepository(session)


async def get_subscribe_to_push_use_case(
    repo: Annotated[
        SqlAlchemyPushSubscriptionRepository, Depends(get_push_subscription_repository)
    ],
) -> SubscribeToPushUseCase:
    return SubscribeToPushUseCase(repo)


async def get_unsubscribe_from_push_use_case(
    repo: Annotated[
        SqlAlchemyPushSubscriptionRepository, Depends(get_push_subscription_repository)
    ],
) -> UnsubscribeFromPushUseCase:
    return UnsubscribeFromPushUseCase(repo)


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.get(
    "/push/vapid-public-key",
    response_model=VapidPublicKeyResponse,
    summary="Get the VAPID public key the frontend needs for PushManager.subscribe()",
)
async def get_vapid_public_key(
    _current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
) -> VapidPublicKeyResponse:
    return VapidPublicKeyResponse(public_key=settings.vapid_public_key)


@router.post(
    "/push/subscribe",
    response_model=None,
    status_code=status.HTTP_201_CREATED,
    summary="Register (or refresh) a browser's Web Push subscription",
)
async def subscribe_to_push(
    request: SubscribeRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[SubscribeToPushUseCase, Depends(get_subscribe_to_push_use_case)],
) -> None:
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    await use_case.execute(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        endpoint=request.endpoint,
        p256dh=request.keys.p256dh,
        auth=request.keys.auth,
    )


@router.delete(
    "/push/subscribe",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a browser's Web Push subscription",
)
async def unsubscribe_from_push(
    request: UnsubscribeRequest,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    use_case: Annotated[UnsubscribeFromPushUseCase, Depends(get_unsubscribe_from_push_use_case)],
) -> None:
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No organization associated with account.",
        )
    await use_case.execute(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        endpoint=request.endpoint,
    )
