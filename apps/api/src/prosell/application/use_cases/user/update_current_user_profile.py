"""Use case for updating the authenticated user's profile."""

from datetime import UTC, datetime

from prosell.application.dto.user import (
    CurrentUserProfileResponse,
    UpdateCurrentUserProfileRequest,
)
from prosell.domain.repositories.user_repository import AbstractUserRepository


class UserNotFoundError(Exception):
    """Raised when the authenticated user no longer exists."""


class EmailAlreadyInUseError(Exception):
    """Raised when another user already owns the requested email."""


class UpdateCurrentUserProfileUseCase:
    """Update the authenticated user's profile fields."""

    def __init__(self, user_repository: AbstractUserRepository) -> None:
        self._user_repository = user_repository

    async def execute(
        self,
        user_id: str,
        request: UpdateCurrentUserProfileRequest,
    ) -> CurrentUserProfileResponse:
        """Persist the updated profile for the current user."""
        from uuid import UUID

        parsed_user_id = UUID(user_id)
        user = await self._user_repository.get_by_id(parsed_user_id)
        if user is None:
            raise UserNotFoundError("User not found")

        normalized_email = request.email.strip().lower()
        existing_user = await self._user_repository.get_by_email(normalized_email)
        if existing_user is not None and existing_user.id != user.id:
            raise EmailAlreadyInUseError("Email is already in use")

        user.full_name = request.full_name.strip()
        user.email = normalized_email
        user.updated_at = datetime.now(UTC)
        updated_user = await self._user_repository.update(user)

        return CurrentUserProfileResponse(
            id=str(updated_user.id),
            email=updated_user.email,
            full_name=updated_user.full_name,
            tenant_id=str(updated_user.tenant_id) if updated_user.tenant_id else None,
        )
