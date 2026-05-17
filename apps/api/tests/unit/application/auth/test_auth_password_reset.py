"""
Unit tests for password reset use cases (B1.1.41-47).

Tests are unit-level (mock repository) — no database required.
These tests validate the business logic of RequestPasswordResetUseCase
and ResetPasswordUseCase, including token expiry, hash update, and
validation rules.
"""
# pyright: reportUnknownArgumentType=false, reportUnknownMemberType=false, reportUnknownParameterType=false, reportMissingParameterType=false, reportUnknownVariableType=false

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from prosell.application.dto.auth.password import (
    RequestPasswordResetRequest,
    ResetPasswordRequest,
)
from prosell.application.use_cases.auth.reset_password import (
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
)
from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus

# =============================================================================
# Helpers
# =============================================================================


def make_user(email: str = "user@example.com") -> User:
    """Create a test User entity."""
    role = Role(
        id=uuid4(),
        role_type=RoleType.SALES_AGENT,
        name="Sales Agent",
        is_system_role=True,
    )
    return User(
        id=uuid4(),
        email=email,
        full_name="Test User",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[role],
        password_hash="$2b$12$existinghashplaceholder",
    )


# =============================================================================
# B1.1.42 — Test user can request password reset
# =============================================================================


class TestRequestPasswordResetUseCase:
    """Tests for RequestPasswordResetUseCase."""

    @pytest.fixture
    def user_repo(self):
        r = AsyncMock()
        r.get_by_email = AsyncMock(return_value=None)
        r.create_verification_token = AsyncMock(return_value=None)
        return r

    @pytest.fixture
    def email_service(self):
        svc = AsyncMock()
        svc.send_password_reset = AsyncMock(return_value=None)
        return svc

    @pytest.mark.asyncio
    async def test_request_reset_for_existing_user_sends_email(self, user_repo, email_service):
        """B1.1.42: User can request a password reset — email is sent."""
        existing_user = make_user("user@example.com")
        user_repo.get_by_email = AsyncMock(return_value=existing_user)

        use_case = RequestPasswordResetUseCase(user_repo, email_service)
        await use_case.execute(RequestPasswordResetRequest(email="user@example.com"))

        # Email should be sent with user email + token (a URL-safe random string)
        email_service.send_password_reset.assert_called_once()
        call_args = email_service.send_password_reset.call_args.args
        assert call_args[0] == "user@example.com"
        # Second arg is the token (URL-safe base64 string, not empty)
        assert len(call_args[1]) > 0

        # Token should be stored with 60-minute expiry (B1.1.43)
        user_repo.create_verification_token.assert_called_once()
        call_kwargs = user_repo.create_verification_token.call_args.kwargs
        assert call_kwargs.get("token_type") == "password_reset"
        assert call_kwargs.get("expires_in_minutes") == 60  # 1 hour

    @pytest.mark.asyncio
    async def test_request_reset_for_existing_user_returns_generic_message(
        self, user_repo, email_service
    ):
        """B1.1.42: Reset request returns generic message (security best practice)."""
        user_repo.get_by_email = AsyncMock(return_value=make_user())
        use_case = RequestPasswordResetUseCase(user_repo, email_service)
        response = await use_case.execute(RequestPasswordResetRequest(email="user@example.com"))
        assert "password reset link" in response.message.lower()

    @pytest.mark.asyncio
    async def test_request_reset_for_nonexistent_user_returns_same_message(
        self, user_repo, email_service
    ):
        """B1.1.42: Request for nonexistent email still returns generic message (no enumeration)."""
        user_repo.get_by_email = AsyncMock(return_value=None)
        use_case = RequestPasswordResetUseCase(user_repo, email_service)
        response = await use_case.execute(RequestPasswordResetRequest(email="nobody@example.com"))
        # Same message as existing user — prevents email enumeration
        assert "password reset link" in response.message.lower()
        # Email NOT sent for nonexistent users
        email_service.send_password_reset.assert_not_called()


# =============================================================================
# B1.1.43 — Test reset token expires after 1 hour
# =============================================================================


class TestTokenExpiry:
    """B1.1.43: Token stored with 60-minute TTL."""

    @pytest.fixture
    def user_repo(self):
        r = AsyncMock()
        r.get_by_email = AsyncMock(return_value=make_user())
        r.create_verification_token = AsyncMock(return_value=None)
        return r

    @pytest.fixture
    def email_service(self):
        svc = AsyncMock()
        svc.send_password_reset = AsyncMock(return_value=None)
        return svc

    @pytest.mark.asyncio
    async def test_token_stored_with_60_minute_expiry(self, user_repo, email_service):
        """B1.1.43: Token created with expires_in_minutes=60."""
        use_case = RequestPasswordResetUseCase(user_repo, email_service)
        await use_case.execute(RequestPasswordResetRequest(email="user@example.com"))

        user_repo.create_verification_token.assert_called_once()
        kwargs = user_repo.create_verification_token.call_args.kwargs
        assert (
            kwargs["expires_in_minutes"] == 60
        ), "Token must expire after 60 minutes (1 hour) per security policy"


# =============================================================================
# B1.1.44 — Test user can reset password with valid token
# =============================================================================


class TestResetPasswordUseCase:
    """Tests for ResetPasswordUseCase."""

    @pytest.fixture
    def user_repo(self):
        r = AsyncMock()
        r.get_by_password_reset_token = AsyncMock(return_value=None)
        r.consume_token = AsyncMock(return_value=True)
        r.update = AsyncMock()
        return r

    @pytest.fixture
    def password_service(self):
        svc = MagicMock()
        svc.hash_password = MagicMock(return_value="$2b$12$newhashvalue")
        return svc

    @pytest.mark.asyncio
    async def test_reset_password_with_valid_token_succeeds(self, user_repo, password_service):
        """B1.1.44: User can reset password with valid token."""
        existing_user = make_user()
        user_repo.get_by_password_reset_token = AsyncMock(return_value=existing_user)

        use_case = ResetPasswordUseCase(user_repo, password_service)
        response = await use_case.execute(
            ResetPasswordRequest(token="valid-token-abc", new_password="NewPass1!")
        )

        assert "successfully" in response.message.lower()
        # Token should be consumed (single-use)
        user_repo.consume_token.assert_called_once_with("valid-token-abc")
        # User should be updated in repo
        user_repo.update.assert_called_once()

    # =========================================================================
    # B1.1.45 — Test invalid token returns 400
    # =========================================================================

    @pytest.mark.asyncio
    async def test_reset_password_with_invalid_token_raises_value_error(
        self, user_repo, password_service
    ):
        """B1.1.45: Invalid or expired token raises ValueError (→ 400)."""
        user_repo.get_by_password_reset_token = AsyncMock(return_value=None)

        use_case = ResetPasswordUseCase(user_repo, password_service)

        with pytest.raises(ValueError, match="Invalid or expired reset token"):
            await use_case.execute(
                ResetPasswordRequest(token="bad-token", new_password="NewPass1!")
            )

    @pytest.mark.asyncio
    async def test_reset_password_expired_token_raises_value_error(
        self, user_repo, password_service
    ):
        """B1.1.45: Expired token (repo returns None) raises ValueError."""
        # When token is expired, the repo returns None (same as invalid)
        user_repo.get_by_password_reset_token = AsyncMock(return_value=None)

        use_case = ResetPasswordUseCase(user_repo, password_service)

        with pytest.raises(ValueError):
            await use_case.execute(
                ResetPasswordRequest(token="expired-token", new_password="NewPass1!")
            )

    # =========================================================================
    # B1.1.46 — Test password requires new different from old
    # =========================================================================

    @pytest.mark.asyncio
    async def test_reset_password_updates_hash_to_new_value(self, user_repo, password_service):
        """B1.1.46: Password hash is updated to the new value after reset."""
        original_hash = "$2b$12$existinghashplaceholder"
        new_hash = "$2b$12$newhashvalue"

        user = make_user()
        assert user.password_hash == original_hash

        user_repo.get_by_password_reset_token = AsyncMock(return_value=user)
        password_service.hash_password = MagicMock(return_value=new_hash)

        use_case = ResetPasswordUseCase(user_repo, password_service)
        await use_case.execute(ResetPasswordRequest(token="valid-token", new_password="NewPass1!"))

        # The user entity's password_hash must have been updated
        assert (
            user.password_hash == new_hash
        ), "Password hash must be updated to new value after reset"

    # =========================================================================
    # B1.1.47 — Test password successfully updates hash
    # =========================================================================

    @pytest.mark.asyncio
    async def test_password_service_hash_is_called_with_new_password(
        self, user_repo, password_service
    ):
        """B1.1.47: password_service.hash_password called with the new password."""
        existing_user = make_user()
        user_repo.get_by_password_reset_token = AsyncMock(return_value=existing_user)

        use_case = ResetPasswordUseCase(user_repo, password_service)
        await use_case.execute(ResetPasswordRequest(token="valid-token", new_password="BrandNew1!"))

        # Verify hashing was called with the new password (not old)
        password_service.hash_password.assert_called_once_with("BrandNew1!")

    @pytest.mark.asyncio
    async def test_token_consumed_after_successful_reset(self, user_repo, password_service):
        """B1.1.47: Token is consumed (single-use) after successful reset."""
        existing_user = make_user()
        user_repo.get_by_password_reset_token = AsyncMock(return_value=existing_user)

        use_case = ResetPasswordUseCase(user_repo, password_service)
        await use_case.execute(
            ResetPasswordRequest(token="one-time-token", new_password="NewPass1!")
        )

        user_repo.consume_token.assert_called_once_with("one-time-token")

    @pytest.mark.asyncio
    async def test_user_record_updated_in_repository(self, user_repo, password_service):
        """B1.1.47: Updated user is persisted to the repository."""
        existing_user = make_user()
        user_repo.get_by_password_reset_token = AsyncMock(return_value=existing_user)

        use_case = ResetPasswordUseCase(user_repo, password_service)
        await use_case.execute(ResetPasswordRequest(token="valid-token", new_password="NewPass1!"))

        user_repo.update.assert_called_once_with(existing_user)
