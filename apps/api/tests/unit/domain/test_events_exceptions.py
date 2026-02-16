"""Domain events and exceptions unit tests.

Tests cover:
- User domain events (registration, login, email verification, etc.)
- Authentication domain exceptions (validation, business rule violations)

This ensures domain layer events and exceptions work correctly.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from prosell.domain.events.user_events import (
    User2FADisabledEvent,
    User2FAEnabledEvent,
    UserEmailVerifiedEvent,
    UserLoggedInEvent,
    UserPasswordResetEvent,
    UserRegisteredEvent,
    UserSessionCreatedEvent,
)
from prosell.domain.exceptions.auth_exceptions import (
    AccountLockedException,
    AuthDomainException,
    BackupCodesExhaustedException,
    DisposableEmailException,
    EmailAlreadyExistsException,
    EmailNotVerifiedException,
    Invalid2FACodeException,
    InvalidCredentialsException,
    InvalidEmailFormatException,
    InvalidPasswordResetTokenException,
    OAuthAccountExistsException,
    OAuthEmailMismatchException,
    UserNotFoundException,
    WeakPasswordException,
)

# ============================================================================
# Domain Events Tests
# ============================================================================


class TestUserRegisteredEvent:
    """Tests for UserRegisteredEvent."""

    def test_create_user_registered_event(self):
        """Test creating UserRegisteredEvent with required fields."""
        user_id = uuid4()
        event = UserRegisteredEvent(
            user_id=user_id,
            email="test@example.com",
            full_name="Test User",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert event.full_name == "Test User"
        assert isinstance(event.timestamp, datetime)
        assert event.metadata is None

    def test_user_registered_event_with_metadata(self):
        """Test UserRegisteredEvent accepts optional metadata."""
        user_id = uuid4()
        metadata = {"source": "google_oauth", "ip": "192.168.1.1"}

        event = UserRegisteredEvent(
            user_id=user_id,
            email="test@example.com",
            full_name="Test User",
            metadata=metadata,
        )

        assert event.metadata == metadata

    def test_user_registered_event_auto_timestamp(self):
        """Test UserRegisteredEvent auto-sets timestamp."""
        before = datetime.now(UTC)

        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )

        after = datetime.now(UTC)
        assert before <= event.timestamp <= after

    def test_user_registered_event_is_frozen(self):
        """Test UserRegisteredEvent is frozen (immutable)."""
        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )

        with pytest.raises(
            ValidationError,
            match="Instance is frozen",
        ):  # Pydantic frozen raises ValidationError
            event.email = "modified@example.com"


class TestUserLoggedInEvent:
    """Tests for UserLoggedInEvent."""

    def test_create_user_logged_in_event_minimal(self):
        """Test creating UserLoggedInEvent without optional fields."""
        user_id = uuid4()
        event = UserLoggedInEvent(
            user_id=user_id,
            email="test@example.com",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert event.ip_address is None
        assert event.user_agent is None
        assert isinstance(event.timestamp, datetime)

    def test_create_user_logged_in_event_full(self):
        """Test creating UserLoggedInEvent with all fields."""
        user_id = uuid4()
        event = UserLoggedInEvent(
            user_id=user_id,
            email="test@example.com",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
        )

        assert event.ip_address == "192.168.1.100"
        assert event.user_agent == "Mozilla/5.0"


class TestUserEmailVerifiedEvent:
    """Tests for UserEmailVerifiedEvent."""

    def test_create_user_email_verified_event(self):
        """Test creating UserEmailVerifiedEvent."""
        user_id = uuid4()
        event = UserEmailVerifiedEvent(
            user_id=user_id,
            email="test@example.com",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert isinstance(event.timestamp, datetime)
        assert event.metadata is None


class TestUserPasswordResetEvent:
    """Tests for UserPasswordResetEvent."""

    def test_create_user_password_reset_event(self):
        """Test creating UserPasswordResetEvent."""
        user_id = uuid4()
        event = UserPasswordResetEvent(
            user_id=user_id,
            email="test@example.com",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert isinstance(event.timestamp, datetime)


class TestUser2FAEnabledEvent:
    """Tests for User2FAEnabledEvent."""

    def test_create_user_2fa_enabled_event(self):
        """Test creating User2FAEnabledEvent."""
        user_id = uuid4()
        event = User2FAEnabledEvent(
            user_id=user_id,
            email="test@example.com",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert isinstance(event.timestamp, datetime)


class TestUser2FADisabledEvent:
    """Tests for User2FADisabledEvent."""

    def test_create_user_2fa_disabled_event(self):
        """Test creating User2FADisabledEvent."""
        user_id = uuid4()
        event = User2FADisabledEvent(
            user_id=user_id,
            email="test@example.com",
        )

        assert event.user_id == user_id
        assert event.email == "test@example.com"
        assert isinstance(event.timestamp, datetime)


class TestUserSessionCreatedEvent:
    """Tests for UserSessionCreatedEvent."""

    def test_create_user_session_created_event(self):
        """Test creating UserSessionCreatedEvent."""
        user_id = uuid4()
        session_id = uuid4()
        event = UserSessionCreatedEvent(
            user_id=user_id,
            session_id=session_id,
        )

        assert event.user_id == user_id
        assert event.session_id == session_id
        assert event.ip_address is None
        assert event.user_agent is None
        assert isinstance(event.timestamp, datetime)

    def test_user_session_created_event_with_context(self):
        """Test UserSessionCreatedEvent with IP and user agent."""
        user_id = uuid4()
        session_id = uuid4()
        event = UserSessionCreatedEvent(
            user_id=user_id,
            session_id=session_id,
            ip_address="10.0.0.1",
            user_agent="TestAgent/1.0",
        )

        assert event.ip_address == "10.0.0.1"
        assert event.user_agent == "TestAgent/1.0"


# ============================================================================
# Domain Exceptions Tests
# ============================================================================


class TestAuthDomainException:
    """Tests for base AuthDomainException."""

    def test_base_exception_message_and_details(self):
        """Test AuthDomainException stores message and details."""
        exc = AuthDomainException(
            message="Test error",
            details={"key": "value"},
        )

        assert exc.message == "Test error"
        assert exc.details == {"key": "value"}

    def test_base_exception_without_details(self):
        """Test AuthDomainException defaults details to empty dict."""
        exc = AuthDomainException(message="Test error")

        assert exc.message == "Test error"
        assert exc.details == {}

    def test_base_exception_str_representation(self):
        """Test AuthDomainException string representation."""
        exc = AuthDomainException(message="Test error")
        assert str(exc) == "Test error"


class TestEmailAlreadyExistsException:
    """Tests for EmailAlreadyExistsException."""

    def test_email_already_exists_message(self):
        """Test exception message includes email."""
        exc = EmailAlreadyExistsException(email="test@example.com")

        assert "test@example.com" in exc.message
        assert exc.details == {"email": "test@example.com"}

    def test_email_already_exists_inheritance(self):
        """Test EmailAlreadyExistsException is AuthDomainException."""
        exc = EmailAlreadyExistsException(email="test@example.com")

        assert isinstance(exc, AuthDomainException)


class TestUserNotFoundException:
    """Tests for UserNotFoundException."""

    @pytest.mark.parametrize(
        "lookup_type,lookup_value,message_fragment",
        [
            ("email", "user@example.com", "user@example.com"),
            ("user_id", "user-123", "user-123"),
            ("none", None, "User not found"),
        ],
    )
    def test_user_not_found_message(self, lookup_type, lookup_value, message_fragment):
        """Test exception message varies by lookup type."""
        if lookup_type == "email":
            exc = UserNotFoundException(email=lookup_value)
        elif lookup_type == "user_id":
            exc = UserNotFoundException(user_id=lookup_value)
        else:
            exc = UserNotFoundException()

        assert message_fragment in exc.message

    def test_user_not_found_details(self):
        """Test UserNotFoundException stores lookup details."""
        exc = UserNotFoundException(email="test@example.com")

        assert exc.details == {"email": "test@example.com"}

        exc2 = UserNotFoundException(user_id="user-123")
        assert exc2.details == {"user_id": "user-123"}


class TestInvalidCredentialsException:
    """Tests for InvalidCredentialsException."""

    def test_invalid_credentials_message(self):
        """Test exception message is clear."""
        exc = InvalidCredentialsException()

        assert "Invalid email or password" in exc.message


class TestEmailNotVerifiedException:
    """Tests for EmailNotVerifiedException."""

    def test_email_not_verified_message(self):
        """Test exception message instructs user."""
        exc = EmailNotVerifiedException()

        assert "verify your email" in exc.message


class TestAccountLockedException:
    """Tests for AccountLockedException."""

    def test_account_locked_with_timestamp(self):
        """Test exception with locked_until timestamp."""
        exc = AccountLockedException(locked_until="2025-01-01 12:00:00")

        assert "2025-01-01 12:00:00" in exc.message

    def test_account_locked_without_timestamp(self):
        """Test exception without locked_until uses default message."""
        exc = AccountLockedException()

        assert "temporarily locked" in exc.message
        assert "2025-01-01 12:00:00" not in exc.message


class TestInvalidEmailFormatException:
    """Tests for InvalidEmailFormatException."""

    def test_invalid_email_format_message(self):
        """Test exception message includes invalid email."""
        exc = InvalidEmailFormatException(email="not-an-email")

        assert "not-an-email" in exc.message
        assert exc.details == {"email": "not-an-email"}


class TestDisposableEmailException:
    """Tests for DisposableEmailException."""

    def test_disposable_email_message(self):
        """Test exception message includes email domain."""
        exc = DisposableEmailException(email="user@tempmail.com")

        assert "tempmail.com" in exc.message
        assert exc.details == {"email": "user@tempmail.com"}


class TestWeakPasswordException:
    """Tests for WeakPasswordException."""

    def test_weak_password_message(self):
        """Test exception message is clear."""
        reasons = ["too short", "no numbers", "no special chars"]
        exc = WeakPasswordException(reasons=reasons)

        assert "security requirements" in exc.message
        assert exc.details == {"reasons": reasons}

    def test_weak_password_empty_reasons(self):
        """Test exception accepts empty reasons list."""
        exc = WeakPasswordException(reasons=[])

        assert exc.details == {"reasons": []}


class TestInvalidPasswordResetTokenException:
    """Tests for InvalidPasswordResetTokenException."""

    def test_invalid_token_message(self):
        """Test exception message is clear."""
        exc = InvalidPasswordResetTokenException()

        assert "Invalid or expired" in exc.message


class TestInvalid2FACodeException:
    """Tests for Invalid2FACodeException."""

    def test_invalid_2fa_code_message(self):
        """Test exception message is clear."""
        exc = Invalid2FACodeException()

        assert "Invalid two-factor" in exc.message


class TestBackupCodesExhaustedException:
    """Tests for BackupCodesExhaustedException."""

    def test_backup_codes_exhausted_message(self):
        """Test exception message instructs user."""
        exc = BackupCodesExhaustedException()

        assert "All backup codes have been used" in exc.message
        assert "reconfigure" in exc.message


class TestOAuthAccountExistsException:
    """Tests for OAuthAccountExistsException."""

    def test_oauth_account_exists_message(self):
        """Test exception message includes provider."""
        exc = OAuthAccountExistsException(
            provider="Google",
            provider_user_id="google-123",
        )

        assert "Google" in exc.message
        assert "already linked" in exc.message
        assert exc.details == {
            "provider": "Google",
            "provider_user_id": "google-123",
        }


class TestOAuthEmailMismatchException:
    """Tests for OAuthEmailMismatchException."""

    def test_oauth_email_mismatch_message(self):
        """Test exception message includes both emails."""
        exc = OAuthEmailMismatchException(
            oauth_email="oauth@example.com",
            expected_email="expected@example.com",
        )

        assert "oauth@example.com" in exc.message
        assert "expected@example.com" in exc.message
        assert "doesn't match" in exc.message
        assert exc.details == {
            "oauth_email": "oauth@example.com",
            "expected_email": "expected@example.com",
        }
