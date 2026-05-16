"""Pydantic validation tests for domain entities and value objects.

This module tests Pydantic-specific validation behaviors:
- ValidationError on invalid data types
- Field validators (disposable email domains)
- Frozen behavior for immutable objects
- Type validation

These tests complement existing domain tests by verifying Pydantic's
validation layer works correctly.
"""

from uuid import UUID, uuid4

import pytest
from pydantic import ValidationError

from prosell.domain.entities import Role, RoleType, User
from prosell.domain.events.user_events import UserRegisteredEvent
from prosell.domain.value_objects import Email


class TestUserPydanticValidation:
    """Test User entity Pydantic validation."""

    def test_user_accepts_min_full_name(self) -> None:
        """Test that User.create() accepts min_length=1 for full_name."""
        # User entity has min_length=1 for full_name
        user = User.create(
            email="test@example.com",
            password_hash="hashed_password",
            full_name="X",  # min_length=1, so this is valid
        )
        assert user.full_name == "X"

    def test_user_rejects_empty_full_name(self) -> None:
        """Test that User.create() rejects empty full_name."""
        with pytest.raises(ValidationError, match="full_name"):
            User.create(
                email="test@example.com",
                password_hash="hashed_password",
                full_name="",  # Empty string (violates min_length=1)
            )

    def test_user_factory_rejects_none_for_required(self) -> None:
        """Test that User.create() rejects None for required fields."""
        with pytest.raises(ValidationError):
            User.create(
                email=None,  # type: ignore[arg-type]
                password_hash="hashed_password",
                full_name="Test",
            )


class TestEmailPydanticValidation:
    """Test Email value object Pydantic validation."""

    def test_email_rejects_disposable_domain(self) -> None:
        """Test that Email rejects disposable domains."""
        with pytest.raises(ValidationError, match="Disposable"):
            Email(address="user@tempmail.com")

    def test_email_rejects_invalid_format(self) -> None:
        """Test that Email rejects invalid format."""
        with pytest.raises(ValidationError, match="email"):
            Email(address="not-an-email")

    def test_email_rejects_empty_string(self) -> None:
        """Test that Email rejects empty string."""
        with pytest.raises(ValidationError):
            Email(address="")

    def test_email_rejects_none(self) -> None:
        """Test that Email rejects None."""
        with pytest.raises(ValidationError):
            Email(address=None)  # type: ignore[arg-type]

    def test_email_rejects_non_string(self) -> None:
        """Test that Email rejects non-string values."""
        with pytest.raises(ValidationError):
            Email(address=12345)  # type: ignore[arg-type]


class TestUserEventPydanticValidation:
    """Test User event Pydantic validation."""

    def test_event_rejects_invalid_uuid(self) -> None:
        """Test that UserRegisteredEvent rejects invalid user_id UUID."""
        with pytest.raises(ValidationError, match="user_id"):
            UserRegisteredEvent(
                user_id="not-a-uuid",  # type: ignore[arg-type]
                email="test@example.com",
                full_name="Test User",
            )

    def test_event_rejects_invalid_uuid_type(self) -> None:
        """Test that UserRegisteredEvent rejects wrong type for user_id."""
        with pytest.raises(ValidationError, match="user_id"):
            UserRegisteredEvent(
                user_id=12345,  # type: ignore[arg-type]
                email="test@example.com",
                full_name="Test User",
            )

    def test_event_auto_timestamp(self) -> None:
        """Test that event auto-generates timestamp."""
        from datetime import datetime
        from zoneinfo import ZoneInfo

        before = datetime.now(ZoneInfo("UTC"))
        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )
        after = datetime.now(ZoneInfo("UTC"))

        assert event.timestamp is not None
        assert before <= event.timestamp <= after


class TestFrozenBehavior:
    """Test Pydantic frozen=True behavior for immutable objects."""

    def test_user_entity_is_mutable(self) -> None:
        """Test that User entity is mutable (not frozen)."""
        user = User.create(
            email="test@example.com",
            password_hash="hashed_password",
            full_name="Test User",
        )

        # User entity should be mutable (can update state)
        user.email = "modified@example.com"
        assert user.email == "modified@example.com"

    def test_event_is_frozen(self) -> None:
        """Test that UserRegisteredEvent is frozen (immutable)."""
        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )

        # Pydantic frozen_model raises ValidationError on modification
        with pytest.raises(ValidationError, match="frozen"):
            event.email = "modified@example.com"

    def test_frozen_rejects_modification(self) -> None:
        """Test that frozen events reject all modifications."""
        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )

        # Try modifying different fields
        with pytest.raises(ValidationError):
            event.user_id = uuid4()

        with pytest.raises(ValidationError):
            event.full_name = "Modified"

    def test_frozen_error_message_clear(self) -> None:
        """Test that frozen validation error message is clear."""
        event = UserRegisteredEvent(
            user_id=uuid4(),
            email="test@example.com",
            full_name="Test User",
        )

        with pytest.raises(ValidationError) as exc_info:
            event.email = "modified@example.com"

        # Error should mention "frozen"
        error_str = str(exc_info.value)
        assert "frozen" in error_str.lower()


class TestRolePydanticValidation:
    """Test Role entity Pydantic validation."""

    def test_role_rejects_invalid_role_type(self) -> None:
        """Test that Role() rejects invalid role_type."""
        with pytest.raises(ValidationError):
            Role(
                id=uuid4(),
                role_type="invalid_role",  # type: ignore[arg-type]
                name="Test Role",
            )

    def test_role_rejects_none_role_type(self) -> None:
        """Test that Role() rejects None for role_type."""
        with pytest.raises(ValidationError):
            Role(
                id=uuid4(),
                role_type=None,  # type: ignore[arg-type]
                name="Test Role",
            )

    def test_role_has_default_name_from_type(self) -> None:
        """Test that system role generates name from role_type."""
        role = Role.create_system_role(role_type=RoleType.ADMIN)
        assert role.name == "Admin"
        assert role.is_system_role is True
        assert role.tenant_id is None


class TestTypeValidation:
    """Test Pydantic type validation."""

    def test_user_id_must_be_uuid(self) -> None:
        """Test that User id must be UUID type."""
        with pytest.raises(ValidationError):
            User(
                id="not-a-uuid",  # type: ignore[arg-type]
                email="test@example.com",
                full_name="Test User",
            )

    def test_user_id_accepts_uuid_string(self) -> None:
        """Test that User accepts valid UUID string for id."""
        valid_uuid = str(uuid4())
        user = User(
            id=valid_uuid,  # type: ignore[arg-type]
            email="test@example.com",
            full_name="Test User",
        )
        assert isinstance(user.id, UUID)

    def test_user_id_accepts_uuid_instance(self) -> None:
        """Test that User accepts UUID instance."""
        valid_uuid = uuid4()
        user = User(
            id=valid_uuid,
            email="test@example.com",
            full_name="Test User",
        )
        assert isinstance(user.id, UUID)
        assert user.id == valid_uuid


class TestEmailDisposableDomains:
    """Test disposable email domain validation."""

    def test_all_disposable_domains_blocked(self) -> None:
        """Test that all disposable domains are blocked."""
        disposable_domains = [
            "user@tempmail.com",
            "test@guerrillamail.com",
            "user@mailinator.com",
            "user@10minutemail.com",
            "test@yopmail.com",
            "user@trashmail.com",
        ]

        for disposable_email in disposable_domains:
            with pytest.raises(ValidationError, match="Disposable"):
                Email(address=disposable_email)

    def test_valid_domains_accepted(self) -> None:
        """Test that valid domains are accepted."""
        valid_emails = [
            "user@gmail.com",
            "test@yahoo.com",
            "user@outlook.com",
            "admin@company.com",
            "user@prosell.com",
        ]

        for valid_email in valid_emails:
            email = Email(address=valid_email)
            assert str(email) == valid_email


class TestBackupCodesParsing:
    """Test backup_codes JSON parsing validator."""

    def test_backup_codes_from_json_string(self) -> None:
        """Test that backup_codes parses from JSON string."""
        import json

        codes_list = ["code1", "code2", "code3"]
        codes_json = json.dumps(codes_list)

        user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            backup_codes=codes_json,  # Pass as JSON string  # type: ignore[arg-type]
        )

        assert user.backup_codes == codes_list
        assert isinstance(user.backup_codes, list)

    def test_backup_codes_from_list(self) -> None:
        """Test that backup_codes accepts list directly."""
        codes_list = ["code1", "code2", "code3"]

        user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            backup_codes=codes_list,  # Pass as list
        )

        assert user.backup_codes == codes_list

    def test_backup_codes_none(self) -> None:
        """Test that backup_codes can be None."""
        user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            backup_codes=None,
        )

        assert user.backup_codes is None
