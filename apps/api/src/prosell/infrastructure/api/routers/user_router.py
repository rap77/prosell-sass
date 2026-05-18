"""User profile router for current authenticated user operations."""

from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from prosell.application.dto.user import (
    CurrentUserProfileResponse,
    UpdateCurrentUserProfileRequest,
)
from prosell.application.use_cases.user import (
    EmailAlreadyInUseError,
    UpdateCurrentUserProfileUseCase,
    UserNotFoundError,
)
from prosell.core.config import settings
from prosell.domain.entities.user import User
from prosell.domain.ports.i_jwt_service import IJWTService
from prosell.domain.repositories.user_repository import AbstractUserRepository
from prosell.infrastructure.api.dependencies import (
    get_current_auth_user_from_cookie,
    get_jwt_service,
    get_user_repository,
)

router = APIRouter()


class UserCookiePayload(BaseModel):
    """Shape expected by Next.js middleware in the user_data cookie."""

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    is_email_verified: bool
    is_2fa_enabled: bool


def _split_full_name(full_name: str) -> tuple[str, str]:
    """Split a full name into first and last name parts."""
    parts = full_name.split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    return first_name, last_name


def _build_profile_response(user: User) -> CurrentUserProfileResponse:
    """Map a domain user into the profile response DTO."""
    return CurrentUserProfileResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        tenant_id=str(user.tenant_id) if user.tenant_id else None,
    )


@router.get("/me", response_model=CurrentUserProfileResponse)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
) -> CurrentUserProfileResponse:
    """Get the authenticated user's editable profile data."""
    return _build_profile_response(current_user)


@router.put("/me", response_model=CurrentUserProfileResponse)
async def update_my_profile(
    request: UpdateCurrentUserProfileRequest,
    response: Response,
    current_user: Annotated[User, Depends(get_current_auth_user_from_cookie)],
    user_repository: Annotated[AbstractUserRepository, Depends(get_user_repository)],
    jwt_service: Annotated[IJWTService, Depends(get_jwt_service)],
) -> CurrentUserProfileResponse:
    """Update the authenticated user's editable profile data."""
    use_case = UpdateCurrentUserProfileUseCase(user_repository)

    try:
        updated_user = await use_case.execute(str(current_user.id), request)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except EmailAlreadyInUseError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    user_roles = await user_repository.get_user_roles(current_user.id)
    first_name, last_name = _split_full_name(updated_user.full_name)
    access_token = jwt_service.generate_access_token(
        current_user.id,
        user_roles,
        email=updated_user.email,
        first_name=first_name,
        last_name=last_name,
    )
    access_token_expiry = datetime.now(UTC) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    user_data_expiry = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days)

    response.set_cookie(
        key="access_token",
        value=access_token,
        expires=access_token_expiry,
        path="/",
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )
    response.set_cookie(
        key="user_data",
        value=quote(
            UserCookiePayload(
                id=updated_user.id,
                email=updated_user.email,
                first_name=first_name,
                last_name=last_name,
                role=user_roles[0] if user_roles else "",
                is_email_verified=current_user.email_verified,
                is_2fa_enabled=current_user.is_2fa_enabled,
            ).model_dump_json()
        ),
        expires=user_data_expiry,
        path="/",
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        domain=settings.cookie_domain,
    )

    return updated_user
