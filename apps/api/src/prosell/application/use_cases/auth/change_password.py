"""Authenticated password change use case."""

from uuid import UUID

from prosell.application.dto.auth import ChangePasswordRequest, ChangePasswordResponse
from prosell.domain.exceptions.auth_exceptions import (
    InvalidCredentialsException,
    PasswordReuseException,
    UserNotFoundException,
    WeakPasswordException,
)
from prosell.domain.ports import IPasswordService
from prosell.domain.repositories.user_repository import AbstractUserRepository


class ChangePasswordUseCase:
    """Use case for changing the current authenticated user's password."""

    def __init__(
        self,
        user_repository: AbstractUserRepository,
        password_service: IPasswordService,
    ) -> None:
        self.user_repository = user_repository
        self.password_service = password_service

    async def execute(
        self,
        user_id: UUID,
        request: ChangePasswordRequest,
    ) -> ChangePasswordResponse:
        """Validate current password and persist the new password."""
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise UserNotFoundException(user_id=str(user_id))

        if not user.password_hash:
            raise InvalidCredentialsException()

        if not self.password_service.verify_password(
            request.current_password,
            user.password_hash,
        ):
            raise InvalidCredentialsException()

        if self.password_service.verify_password(request.new_password, user.password_hash):
            raise PasswordReuseException()

        password_errors = self.password_service.validate_password_strength(request.new_password)
        if password_errors:
            raise WeakPasswordException(password_errors)

        user.update_password(self.password_service.hash_password(request.new_password))
        await self.user_repository.update(user)

        return ChangePasswordResponse(message="Password updated successfully")
