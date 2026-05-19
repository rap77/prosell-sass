"""Unit tests for authenticated password change."""

from uuid import UUID, uuid4

import pytest

from prosell.application.dto.auth import ChangePasswordRequest
from prosell.application.use_cases.auth.change_password import ChangePasswordUseCase
from prosell.domain.entities.user import User, UserStatus
from prosell.domain.exceptions.auth_exceptions import InvalidCredentialsException
from prosell.domain.repositories.user_repository import AbstractUserRepository


class StubPasswordService:
    """Minimal password service stub for change password tests."""

    def hash_password(self, password: str) -> str:
        return f"hashed::{password}"

    def verify_password(self, password: str, hashed: str) -> bool:
        return hashed == f"hashed::{password}"

    def validate_password_strength(self, password: str) -> list[str]:
        _ = password
        return []


class StubUserRepository(AbstractUserRepository):
    """In-memory user repository stub."""

    def __init__(self, user: User | None) -> None:
        self.user = user
        self.updated_user: User | None = None

    async def create(self, user: User) -> User:
        raise NotImplementedError

    async def get_by_id(self, user_id: UUID) -> User | None:
        if self.user and self.user.id == user_id:
            return self.user
        return None

    async def get_by_email(self, email: str) -> User | None:
        raise NotImplementedError

    async def update(self, user: User) -> User:
        self.updated_user = user
        self.user = user
        return user

    async def delete(self, user_id: UUID) -> None:
        raise NotImplementedError

    async def list_with_pagination(
        self,
        limit: int = 100,
        offset: int = 0,
        tenant_id: UUID | None = None,
    ) -> list[User]:
        raise NotImplementedError

    async def get_user_roles(self, user_id: UUID) -> list[str]:
        raise NotImplementedError

    async def email_exists(self, email: str) -> bool:
        raise NotImplementedError

    async def get_by_verification_token(self, token: str) -> User | None:
        raise NotImplementedError

    async def get_by_password_reset_token(self, token: str) -> User | None:
        raise NotImplementedError

    async def get_by_oauth(self, provider: str, provider_user_id: str) -> User | None:
        raise NotImplementedError

    async def create_verification_token(
        self,
        user_id: UUID,
        token: str,
        token_type: str,
        expires_in_minutes: int = 60,
    ) -> None:
        raise NotImplementedError

    async def consume_token(self, token: str) -> bool:
        raise NotImplementedError

    async def get_users_by_tenant_and_role(
        self,
        tenant_id: UUID,
        role: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        raise NotImplementedError

    async def count_users_by_tenant_and_role(self, tenant_id: UUID, role: str) -> int:
        raise NotImplementedError


def build_user() -> User:
    """Create a password-backed active user for tests."""
    return User(
        id=uuid4(),
        email="seller@example.com",
        full_name="Ana Seller",
        password_hash="hashed::CurrentPass1!",
        status=UserStatus.ACTIVE,
        email_verified=True,
        tenant_id=uuid4(),
    )


@pytest.mark.asyncio
async def test_change_password_updates_hash_when_current_password_is_valid() -> None:
    user = build_user()
    repository = StubUserRepository(user)
    use_case = ChangePasswordUseCase(repository, StubPasswordService())

    response = await use_case.execute(
        user.id,
        ChangePasswordRequest(
            current_password="CurrentPass1!",
            new_password="NewPass2@",
        ),
    )

    assert response.message == "Password updated successfully"
    assert repository.updated_user is not None
    assert repository.updated_user.password_hash == "hashed::NewPass2@"


@pytest.mark.asyncio
async def test_change_password_rejects_invalid_current_password() -> None:
    user = build_user()
    repository = StubUserRepository(user)
    use_case = ChangePasswordUseCase(repository, StubPasswordService())

    with pytest.raises(InvalidCredentialsException):
        await use_case.execute(
            user.id,
            ChangePasswordRequest(
                current_password="WrongPass1!",
                new_password="NewPass2@",
            ),
        )
