"""Unit tests for Value Object entities.
Tests all business logic in Value Object domain entities:
- Email value object (validation, normalization)
- UserStatus value object (account status)
"""

import pytest

from prosell.domain.value_objects import Email, UserStatus


class TestEmailValueObject:
    """Test Email value object."""

    def test_create_valid_email(self) -> None:
        """Test creating a valid email value object."""
        email = Email(value="test@example.com")
        assert email.value == "test@example.com"
        assert email.domain == "example.com"
        assert email.local_part == "test"
        assert str(email) == "test@example.com"  # __str__

    def test_create_invalid_email_raises(self) -> None:
        """Test that invalid emails raise ValueError."""
        # Invalid format - no @
        with pytest.raises(ValueError, match="Invalid email format"):
            Email(value="invalidexample.com")

        # Invalid format - no domain
        with pytest.raises(ValueError, match="Invalid email format"):
            Email(value="user@")

        # Empty string
        with pytest.raises(ValueError, match="Invalid email format"):
            Email(value="")

        # Disposable domain
        with pytest.raises(ValueError, match="Disposable email"):
            Email(value="user@tempmail.com")

    def test_email_domain_property(self) -> None:
        """Test email domain property."""
        email = Email(value="user@example.com")
        assert email.domain == "example.com"

    def test_email_local_part_property(self) -> None:
        """Test email local_part property."""
        email = Email(value="user@example.com")
        assert email.local_part == "user"

    def test_email_str_representation(self) -> None:
        """Test email __str__ method."""
        email = Email(value="user@example.com")
        assert str(email) == "user@example.com"


class TestUserStatusValueObject:
    """Test UserStatus value object."""

    def test_user_status_enum_values(self) -> None:
        """Test that UserStatus enum has all expected values."""
        assert UserStatus.PENDING_VERIFICATION == "pending_verification"
        assert UserStatus.ACTIVE == "active"
        assert UserStatus.SUSPENDED == "suspended"

    def test_user_status_is_string_enum(self) -> None:
        """Test that UserStatus inherits from str and Enum."""
        assert isinstance(UserStatus.ACTIVE, str)
        assert UserStatus.ACTIVE in UserStatus

    def test_user_status_comparison(self) -> None:
        """Test UserStatus comparison operations."""
        pending = UserStatus.PENDING_VERIFICATION
        active = UserStatus.ACTIVE

        # Equality
        assert pending == UserStatus.PENDING_VERIFICATION
        assert active != pending

        # String comparison
        assert pending == "pending_verification"
        assert active == "active"

    def test_user_status_is_active(self) -> None:
        """Test UserStatus is_active method."""
        assert UserStatus.ACTIVE.is_active() is True
        assert UserStatus.PENDING_VERIFICATION.is_active() is False
        assert UserStatus.SUSPENDED.is_active() is False

    def test_user_status_str_representation(self) -> None:
        """Test UserStatus __str__ method."""
        assert str(UserStatus.ACTIVE) == "active"
        assert str(UserStatus.PENDING_VERIFICATION) == "pending_verification"
