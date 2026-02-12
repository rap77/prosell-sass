"""Unit tests for User entity.

Tests all business logic in the User domain entity:
- Factory methods (create, create_oauth)
- State queries (is_locked, can_login)
- Failed login tracking (record_failed_login, reset_failed_attempts)
- Email verification and 2FA methods
- Role checking
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from prosell.domain.entities.role import Role, RoleType
from prosell.domain.entities.user import User, UserStatus


class TestUserFactory:
    """Test User.create() factory method."""

    def test_create_user_returns_user_with_defaults(self) -> None:
        """Test that User.create() returns a User with all default values."""
        user = User.create(
            email="test@example.com",
            password_hash="hashed_password",
            full_name="Test User",
        )

        assert user.id is not None
        assert isinstance(user.id, UUID)
        assert user.email == "test@example.com"
        assert user.password_hash == "hashed_password"
        assert user.full_name == "Test User"
        assert user.avatar_url is None
        assert user.status == UserStatus.PENDING_VERIFICATION
        assert user.email_verified is False
        assert user.email_verified_at is None
        assert user.is_2fa_enabled is False
        assert user.totp_secret is None
        assert user.backup_codes is None
        assert user.last_login_at is None
        assert user.last_login_ip is None
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert user.tenant_id is None
        assert user.roles is None
        assert isinstance(user.created_at, datetime)
        assert isinstance(user.updated_at, datetime)

    def test_create_oauth_user_returns_verified_user(self) -> None:
        """Test that User.create_oauth() returns a verified User (for OAuth logins)."""
        user = User.create_oauth(
            email="oauth@example.com",
            full_name="OAuth User",
            avatar_url="https://example.com/avatar.jpg",
        )

        assert user.id is not None
        assert isinstance(user.id, UUID)
        assert user.email == "oauth@example.com"
        assert user.password_hash is None  # OAuth users have no password
        assert user.full_name == "OAuth User"
        assert user.avatar_url == "https://example.com/avatar.jpg"
        assert user.status == UserStatus.ACTIVE  # OAuth users are auto-verified
        assert user.email_verified is True
        assert isinstance(user.email_verified_at, datetime)
        assert user.is_2fa_enabled is False
        assert user.totp_secret is None
        assert user.backup_codes is None
        assert user.last_login_at is None
        assert user.last_login_ip is None
        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert user.tenant_id is None
        assert user.roles is None
        assert isinstance(user.created_at, datetime)
        assert isinstance(user.updated_at, datetime)


class TestUserIsLocked:
    """Test User.is_locked() method."""

    @pytest.mark.parametrize(
        "locked_until, expected",
        [
            (None, False),  # No lock time = not locked
            (datetime.now(UTC) + timedelta(minutes=5), True),  # Future lock time = locked
            (datetime.now(UTC) - timedelta(minutes=5), False),  # Past lock time = not locked
            (datetime.now(UTC), False),  # Current time (should be treated as future) = not locked
        ],
    )
    def test_is_locked(self, locked_until, expected) -> None:
        """Test is_locked() returns correct boolean."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.locked_until = locked_until

        assert user.is_locked() == expected


class TestUserCanLogin:
    """Test User.can_login() method."""

    @pytest.mark.parametrize(
        "status, email_verified, is_locked, expected",
        [
            (UserStatus.ACTIVE, True, False, True),  # All conditions met
            (UserStatus.ACTIVE, False, False, False),  # Email not verified
            (UserStatus.ACTIVE, True, True, False),  # Account locked
            (UserStatus.PENDING_VERIFICATION, True, False, False),  # Not active
            (UserStatus.SUSPENDED, True, False, False),  # Suspended
            (UserStatus.SUSPENDED, True, True, False),  # Suspended but locked
        ],
    )
    def test_can_login(self, status, email_verified, is_locked, expected) -> None:
        """Test can_login() returns correct boolean based on conditions."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.status = status
        user.email_verified = email_verified
        user.locked_until = datetime.now(UTC) + timedelta(minutes=5) if is_locked else None

        assert user.can_login() == expected


class TestUserRecordFailedLogin:
    """Test User.record_failed_login() method."""

    def test_increment_failed_attempts(self) -> None:
        """Test that failed attempts counter increments."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.failed_login_attempts = 3

        result = user.record_failed_login()

        assert result is False  # Should not lock yet
        assert user.failed_login_attempts == 4
        assert user.locked_until is None
        assert isinstance(user.updated_at, datetime)

    def test_lock_after_max_attempts(self) -> None:
        """Test that account locks after 5 failed attempts."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.failed_login_attempts = 4

        result = user.record_failed_login(max_attempts=5, lock_minutes=15)

        assert result is True  # Should lock now
        assert user.failed_login_attempts == 5
        assert isinstance(user.locked_until, datetime)
        # Check lock time is approximately 15 minutes from now
        lock_min = datetime.now(UTC) + timedelta(minutes=14)
        lock_max = datetime.now(UTC) + timedelta(minutes=16)
        assert lock_min < user.locked_until < lock_max

    def test_custom_max_attempts(self) -> None:
        """Test record_failed_login with custom max_attempts."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.failed_login_attempts = 9

        result = user.record_failed_login(max_attempts=10, lock_minutes=30)

        assert result is True  # Should lock with custom max
        assert user.failed_login_attempts == 10
        assert isinstance(user.locked_until, datetime)


class TestUserResetFailedAttempts:
    """Test User.reset_failed_attempts() method."""

    def test_reset_counter_and_unlock(self) -> None:
        """Test that reset clears counter and unlocks account."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.failed_login_attempts = 5
        user.locked_until = datetime.now(UTC) + timedelta(minutes=10)

        user.reset_failed_attempts()

        assert user.failed_login_attempts == 0
        assert user.locked_until is None
        assert isinstance(user.updated_at, datetime)


class TestUserEmailVerification:
    """Test User email verification methods."""

    def test_verify_email_marks_verified(self) -> None:
        """Test that verify_email() marks user as verified."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        user.verify_email()

        assert user.email_verified is True
        assert isinstance(user.email_verified_at, datetime)
        assert user.status == UserStatus.ACTIVE

    def test_verify_email_idempotent(self) -> None:
        """Test that verify_email() is idempotent (calling twice has no side effect)."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        user.verify_email()
        first_verified_at = user.email_verified_at
        first_status = user.status

        user.verify_email()  # Call again

        assert user.email_verified_at == first_verified_at  # Should not change
        assert user.status == first_status  # Should not change


class TestUserTwoFactor:
    """Test User 2FA methods."""

    def test_enable_2fa(self) -> None:
        """Test enable_2fa() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        secret = "JBSWY3DPEHPK3PXP"
        codes = [
            "123456",
            "234567",
            "345678",
            "456789",
            "567890",
            "678901",
            "789012",
            "890123",
            "901234",
        ]

        user.enable_2fa(secret, codes)

        assert user.is_2fa_enabled is True
        assert user.totp_secret == secret
        assert user.backup_codes == codes
        assert isinstance(user.updated_at, datetime)

    def test_enable_2fa_already_enabled(self) -> None:
        """Test that enable_2fa() when already enabled replaces existing values."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.is_2fa_enabled = True
        user.totp_secret = "existing_secret"
        user.backup_codes = ["existing_code"]

        # enable_2fa() replaces existing values
        user.enable_2fa("new_secret", ["new_code"])

        assert user.is_2fa_enabled is True
        assert user.totp_secret == "new_secret"  # Replaces existing secret
        assert user.backup_codes == ["new_code"]  # Replaces existing codes

    def test_disable_2fa(self) -> None:
        """Test disable_2fa() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.is_2fa_enabled = True
        user.totp_secret = "secret"
        user.backup_codes = ["code1", "code2"]

        user.disable_2fa()

        assert user.is_2fa_enabled is False
        assert user.totp_secret is None
        assert user.backup_codes is None
        assert isinstance(user.updated_at, datetime)

    def test_use_backup_code(self) -> None:
        """Test use_backup_code() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.is_2fa_enabled = True
        user.backup_codes = ["code1", "code2", "code3"]

        result = user.use_backup_code("code2")

        assert result is True
        assert "code2" not in user.backup_codes  # Code should be removed
        assert user.backup_codes == ["code1", "code3"]

    def test_use_backup_code_invalid(self) -> None:
        """Test use_backup_code() with invalid code."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.is_2fa_enabled = True
        user.backup_codes = ["code1", "code2"]

        result = user.use_backup_code("invalid_code")

        assert result is False
        assert user.backup_codes == ["code1", "code2"]  # No codes removed


class TestUserRoles:
    """Test User role-related methods."""

    def test_has_role_with_no_roles(self) -> None:
        """Test has_role() returns False when user has no roles."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        assert not user.has_role(RoleType.SUPER_ADMIN)
        assert not user.has_role(RoleType.MANAGER)

    def test_has_role_with_single_role(self) -> None:
        """Test has_role() returns True when user has single role."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        admin_role = Role.create_system_role(RoleType.ADMIN)
        user.roles = [admin_role]

        assert user.has_role(RoleType.ADMIN)
        assert not user.has_role(RoleType.MANAGER)

    def test_has_role_with_multiple_roles(self) -> None:
        """Test has_role() returns True when user has multiple roles."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        admin_role = Role.create_system_role(RoleType.ADMIN)
        manager_role = Role.create_system_role(RoleType.MANAGER)
        user.roles = [admin_role, manager_role]

        assert user.has_role(RoleType.ADMIN)
        assert user.has_role(RoleType.MANAGER)
        assert not user.has_role(RoleType.SALES_AGENT)  # No SALES_AGENT role


class TestUserAccountStatus:
    """Test User account status methods."""

    def test_suspend(self) -> None:
        """Test suspend() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        user.suspend()

        assert user.status == UserStatus.SUSPENDED
        assert isinstance(user.updated_at, datetime)

    def test_activate(self) -> None:
        """Test activate() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.status = UserStatus.SUSPENDED

        user.activate()

        assert user.status == UserStatus.ACTIVE
        assert isinstance(user.updated_at, datetime)

    def test_update_last_login(self) -> None:
        """Test update_last_login() method."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )

        test_ip = "192.168.1.1"

        user.update_last_login(test_ip)

        assert user.last_login_at is not None
        assert isinstance(user.last_login_at, datetime)
        assert user.last_login_ip == test_ip
        assert isinstance(user.updated_at, datetime)


class TestUserEdgeCases:
    """Test edge cases and special scenarios."""

    def test_oauth_user_no_password(self) -> None:
        """Test that OAuth users (password_hash=None) can still function."""
        user = User.create_oauth(
            email="oauth@example.com",
            full_name="OAuth User",
        )

        assert user.password_hash is None
        assert user.can_login()  # OAuth users should be able to login (if verified and active)

    def test_locked_user_cannot_login_even_if_verified(self) -> None:
        """Test that locked user cannot login even if verified and active."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.status = UserStatus.ACTIVE
        user.email_verified = True
        user.locked_until = datetime.now(UTC) + timedelta(minutes=5)

        assert not user.can_login()  # Locked user should not be able to login

    def test_locked_expires_in_past(self) -> None:
        """Test that lock with past expiration allows login."""
        user = User.create(
            email="test@example.com",
            password_hash="hash",
            full_name="Test",
        )
        user.status = UserStatus.ACTIVE  # Must be active to login
        user.email_verified = True  # Must be verified to login
        user.locked_until = datetime.now(UTC) - timedelta(minutes=5)  # Lock expired 5 minutes ago

        assert user.is_locked() is False  # Lock expired, so not locked
        assert user.can_login() is True  # User should be able to login now
