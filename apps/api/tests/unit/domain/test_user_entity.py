"""Unit tests for User entity (45 tests)."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from prosell.domain.entities.user import User, UserStatus


class TestUserFactoryMethods:
    """Test User entity factory methods."""

    def test_create_user_factory(self) -> None:
        """Test User.create() factory method for regular registration."""
        user = User.create(
            email="test@example.com",
            password_hash="hashed_password",
            full_name="Test User",
        )
        assert isinstance(user.id, UUID)
        assert user.email == "test@example.com"
        assert user.password_hash == "hashed_password"

    def test_create_oauth_user_factory(self) -> None:
        """Test User.create_oauth() factory method for OAuth users."""
        user = User.create_oauth(
            email="oauth@example.com",
            full_name="OAuth User",
        )
        assert user.password_hash is None
        assert user.status == UserStatus.ACTIVE

    def test_user_factory_pending_status(self) -> None:
        """Test that factory creates user in PENDING_VERIFICATION status."""
        user = User.create(
            email="pending@example.com",
            password_hash="hash",
            full_name="Pending User",
        )
        assert user.status == UserStatus.PENDING_VERIFICATION

    def test_oauth_user_factory_active_status(self) -> None:
        """Test that OAuth factory creates user in ACTIVE status."""
        user = User.create_oauth(
            email="active@example.com",
            full_name="Active User",
        )
        assert user.status == UserStatus.ACTIVE


class TestUserEmailVerification:
    """Test email verification workflow."""

    def test_verify_email_updates_status(self) -> None:
        """Test that verify_email() changes status to ACTIVE."""
        user = User.create(
            email="verify@example.com",
            password_hash="hash",
            full_name="Verify User",
        )
        user.verify_email()
        assert user.status == UserStatus.ACTIVE
        assert user.email_verified is True

    def test_verify_email_sets_timestamp(self) -> None:
        """Test that verify_email() sets email_verified_at."""
        user = User.create(
            email="timestamp@example.com",
            password_hash="hash",
            full_name="Timestamp User",
        )
        assert user.email_verified_at is None
        user.verify_email()
        assert isinstance(user.email_verified_at, datetime)
        assert user.email_verified_at <= datetime.now(UTC)

    def test_verify_email_already_verified_noop(self) -> None:
        """Test that verify_email() is idempotent if already verified."""
        user = User.create(
            email="already@example.com",
            password_hash="hash",
            full_name="Already Verified",
        )
        user.verify_email()
        original_status = user.status
        original_verified_at = user.email_verified_at
        user.verify_email()
        assert user.status == original_status
        assert user.email_verified_at == original_verified_at


class TestUserAccountLocking:
    """Test account locking mechanism."""

    def test_is_locked_returns_false_when_no_lock(self) -> None:
        """Test is_locked() returns False when locked_until is None."""
        user = User.create(
            email="nolock@example.com",
            password_hash="hash",
            full_name="No Lock User",
        )
        assert user.locked_until is None
        assert user.is_locked() is False

    def test_is_locked_returns_true_when_locked(self) -> None:
        """Test is_locked() returns True when locked_until is in future."""
        user = User.create(
            email="locked@example.com",
            password_hash="hash",
            full_name="Locked User",
        )
        user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
        assert user.is_locked() is True

    def test_is_locked_returns_false_after_lock_expired(self) -> None:
        """Test is_locked() returns False when lock_until has passed."""
        user = User.create(
            email="expired@example.com",
            password_hash="hash",
            full_name="Expired Lock User",
        )
        user.locked_until = datetime.now(UTC) - timedelta(minutes=5)
        assert user.is_locked() is False

    def test_record_failed_login_increments_attempts(self) -> None:
        """Test that record_failed_login() increments attempts counter."""
        user = User.create(
            email="attempts@example.com",
            password_hash="hash",
            full_name="Attempts User",
        )
        assert user.failed_login_attempts == 0
        user.record_failed_login()
        assert user.failed_login_attempts == 1
        user.record_failed_login()
        assert user.failed_login_attempts == 2
        user.record_failed_login()
        assert user.failed_login_attempts == 3

    def test_record_failed_login_locks_after_threshold(self) -> None:
        """Test that record_failed_login() locks account after threshold."""
        user = User.create(
            email="lockthreshold@example.com",
            password_hash="hash",
            full_name="Lock Threshold User",
        )
        for _ in range(4):
            result = user.record_failed_login()
            assert result is False
        result = user.record_failed_login()
        assert result is True
        assert user.failed_login_attempts == 5
        assert user.is_locked() is True
        assert isinstance(user.locked_until, datetime)

    def test_record_failed_login_custom_threshold(self) -> None:
        """Test record_failed_login() with custom max_attempts."""
        user = User.create(
            email="custom@example.com",
            password_hash="hash",
            full_name="Custom Threshold User",
        )
        for _ in range(2):
            result = user.record_failed_login(max_attempts=3)
            assert result is False
        result = user.record_failed_login(max_attempts=3)
        assert result is True
        assert user.is_locked() is True

    def test_record_failed_login_custom_lock_duration(self) -> None:
        """Test record_failed_login() with custom lock duration."""
        user = User.create(
            email="duration@example.com",
            password_hash="hash",
            full_name="Lock Duration User",
        )
        user.record_failed_login()
        result = user.record_failed_login(max_attempts=1, lock_minutes=30)
        assert result is True
        assert user.locked_until is not None
        assert user.locked_until > datetime.now(UTC)

    def test_reset_failed_attempts_clears_counter(self) -> None:
        """Test that reset_failed_attempts() clears counter."""
        user = User.create(
            email="reset@example.com",
            password_hash="hash",
            full_name="Reset Attempts User",
        )
        user.record_failed_login()
        user.record_failed_login()
        assert user.failed_login_attempts == 2
        user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
        user.reset_failed_attempts()
        assert user.failed_login_attempts == 0
        assert user.locked_until is None


class TestUserLoginCapability:
    """Test login capability checks."""

    def test_can_login_returns_true_when_active_verified(self) -> None:
        """Test can_login() returns True when user can login."""
        user = User.create(
            email="canlogin@example.com",
            password_hash="hash",
            full_name="Can Login User",
        )
        user.verify_email()
        assert user.can_login() is True

    def test_can_login_returns_false_when_pending(self) -> None:
        """Test can_login() returns False for pending verification."""
        user = User.create(
            email="pending@example.com",
            password_hash="hash",
            full_name="Pending User",
        )
        assert user.can_login() is False

    def test_can_login_returns_false_when_not_verified(self) -> None:
        """Test can_login() returns False when email not verified."""
        user = User.create(
            email="notverified@example.com",
            password_hash="hash",
            full_name="Not Verified User",
        )
        user.status = UserStatus.ACTIVE
        assert user.can_login() is False

    def test_can_login_returns_false_when_locked(self) -> None:
        """Test can_login() returns False when account is locked."""
        user = User.create(
            email="lockedlogin@example.com",
            password_hash="hash",
            full_name="Locked Login User",
        )
        user.verify_email()
        user.locked_until = datetime.now(UTC) + timedelta(minutes=15)
        assert user.can_login() is False

    def test_can_login_returns_false_when_suspended(self) -> None:
        """Test can_login() returns False for suspended users."""
        user = User.create(
            email="suspended@example.com",
            password_hash="hash",
            full_name="Suspended User",
        )
        user.verify_email()
        assert user.can_login() is True
        user.suspend()
        assert user.can_login() is False


class TestUserTwoFactorAuth:
    """Test two-factor authentication functionality."""

    def test_enable_2fa_sets_totp_secret(self) -> None:
        """Test that enable_2fa() sets TOTP secret."""
        user = User.create(
            email="enable2fa@example.com",
            password_hash="hash",
            full_name="Enable 2FA User",
        )
        totp_secret = "JBSWY3DPEHPK3PXP"
        backup_codes = ["123456", "234567"]
        user.enable_2fa(totp_secret=totp_secret, backup_codes=backup_codes)
        assert user.is_2fa_enabled is True
        assert user.totp_secret == totp_secret
        assert user.backup_codes is not None and user.backup_codes == backup_codes

    def test_enable_2fa_sets_backup_codes(self) -> None:
        """Test that enable_2fa() stores backup codes."""
        user = User.create(
            email="backup@example.com",
            password_hash="hash",
            full_name="Backup Codes User",
        )
        backup_codes = ["111111", "222222", "333333"]
        user.enable_2fa(totp_secret="secret", backup_codes=backup_codes)
        assert user.backup_codes is not None and user.backup_codes == backup_codes
        assert user.backup_codes is not None and len(user.backup_codes) == 3

    def test_enable_2fa_sets_flag(self) -> None:
        """Test that enable_2fa() sets the flag."""
        user = User.create(
            email="flag@example.com",
            password_hash="hash",
            full_name="Flag User",
        )
        assert user.is_2fa_enabled is False
        user.enable_2fa(totp_secret="secret", backup_codes=[])
        assert user.is_2fa_enabled is True

    def test_disable_2fa_clears_totp_secret(self) -> None:
        """Test that disable_2fa() clears TOTP secret."""
        user = User.create(
            email="disable@example.com",
            password_hash="hash",
            full_name="Disable 2FA User",
        )
        user.enable_2fa(totp_secret="secret", backup_codes=[])
        assert user.totp_secret == "secret"
        user.disable_2fa()
        assert user.totp_secret is None

    def test_disable_2fa_clears_backup_codes(self) -> None:
        """Test that disable_2fa() clears backup codes."""
        user = User.create(
            email="disablecodes@example.com",
            password_hash="hash",
            full_name="Disable Codes User",
        )
        user.enable_2fa(totp_secret="secret", backup_codes=["111", "222"])
        assert user.backup_codes is not None and user.backup_codes == ["111", "222"]
        user.disable_2fa()
        assert user.backup_codes is None

    def test_disable_2fa_clears_flag(self) -> None:
        """Test that disable_2fa() clears the flag."""
        user = User.create(
            email="disableflag@example.com",
            password_hash="hash",
            full_name="Disable Flag User",
        )
        user.enable_2fa(totp_secret="secret", backup_codes=[])
        assert user.is_2fa_enabled is True
        user.disable_2fa()
        assert user.is_2fa_enabled is False

    def test_use_backup_code_valid_removes_code(self) -> None:
        """Test that use_backup_code() removes valid code."""
        user = User.create(
            email="validcode@example.com",
            password_hash="hash",
            full_name="Valid Code User",
        )
        backup_codes = ["111111", "222222", "333333"]
        user.enable_2fa(totp_secret="secret", backup_codes=backup_codes)
        result = user.use_backup_code("222222")
        assert result is True
        assert user.backup_codes is not None and "222222" not in user.backup_codes  # type: ignore[literal-required]
        assert user.backup_codes is not None and len(user.backup_codes) == 2

    def test_use_backup_code_invalid_returns_false(self) -> None:
        """Test that use_backup_code() returns False for invalid code."""
        user = User.create(
            email="invalidcode@example.com",
            password_hash="hash",
            full_name="Invalid Code User",
        )
        backup_codes = ["111111", "222222"]
        user.enable_2fa(totp_secret="secret", backup_codes=backup_codes)
        result = user.use_backup_code("999999")
        assert result is False
        assert user.backup_codes is not None and len(user.backup_codes) == 2

    def test_use_backup_code_empty_returns_false(self) -> None:
        """Test that use_backup_code() returns False when no backup codes."""
        user = User.create(
            email="nocode@example.com",
            password_hash="hash",
            full_name="No Code User",
        )
        result = user.use_backup_code("any")
        assert result is False

    def test_use_backup_code_last_code_removes_it(self) -> None:
        """Test that using the last backup code removes it."""
        user = User.create(
            email="lastcode@example.com",
            password_hash="hash",
            full_name="Last Code User",
        )
        backup_codes = ["111111"]
        user.enable_2fa(totp_secret="secret", backup_codes=backup_codes)
        user.use_backup_code("111111")
        assert user.backup_codes is not None and user.backup_codes == []


class TestUserRoleManagement:
    """Test role management functionality."""

    def test_has_role_returns_true_when_role_assigned(self) -> None:
        """Test has_role() returns True when user has the role."""
        from prosell.domain.entities.role import Role, RoleType

        user = User.create(
            email="withrole@example.com",
            password_hash="hash",
            full_name="User With Role",
        )
        admin_role = Role.create_system_role(RoleType.ADMIN)
        user.roles = [admin_role]
        assert user.has_role("admin") is True

    def test_has_role_returns_false_when_no_roles(self) -> None:
        """Test has_role() returns False when roles is None."""
        user = User.create(
            email="noroles@example.com",
            password_hash="hash",
            full_name="No Roles User",
        )
        assert user.roles is None
        assert user.has_role("admin") is False

    def test_has_role_returns_false_when_role_missing(self) -> None:
        """Test has_role() returns False when role not in list."""
        from prosell.domain.entities.role import Role, RoleType

        user = User.create(
            email="wrongrole@example.com",
            password_hash="hash",
            full_name="Wrong Role User",
        )
        viewer_role = Role.create_system_role(RoleType.VIEWER)
        user.roles = [viewer_role]
        assert user.has_role("admin") is False
        assert user.has_role("viewer") is True


class TestUserHasPermission:
    """Test has_permission() — code review finding #3: this replaces the
    _user_has_permission() free function duplicated in product_router.py
    and admin_dealers_router.py."""

    def test_has_permission_returns_true_when_role_grants_it(self) -> None:
        from prosell.domain.entities.role import Permission, Role, RoleType

        user = User.create(
            email="admin-perm@example.com",
            password_hash="hash",
            full_name="Admin Perm User",
        )
        user.roles = [Role.create_system_role(RoleType.ADMIN)]
        assert user.has_permission(Permission.ORG_ADMIN_VIEW_ALL) is True

    def test_has_permission_returns_false_when_no_roles(self) -> None:
        from prosell.domain.entities.role import Permission

        user = User.create(
            email="noroles-perm@example.com",
            password_hash="hash",
            full_name="No Roles Perm User",
        )
        assert user.roles is None
        assert user.has_permission(Permission.ORG_ADMIN_VIEW_ALL) is False

    def test_has_permission_returns_false_when_role_lacks_it(self) -> None:
        from prosell.domain.entities.role import Permission, Role, RoleType

        user = User.create(
            email="viewer-perm@example.com",
            password_hash="hash",
            full_name="Viewer Perm User",
        )
        user.roles = [Role.create_system_role(RoleType.VIEWER)]
        assert user.has_permission(Permission.ORG_ADMIN_VIEW_ALL) is False


class TestUserAccountStatus:
    """Test account status changes."""

    def test_suspend_changes_status_to_suspended(self) -> None:
        """Test that suspend() changes status to SUSPENDED."""
        user = User.create(
            email="suspend@example.com",
            password_hash="hash",
            full_name="Suspend User",
        )
        user.verify_email()
        user.suspend()
        assert user.status == UserStatus.SUSPENDED

    def test_activate_changes_status_to_active(self) -> None:
        """Test that activate() changes status to ACTIVE."""
        user = User.create(
            email="activate@example.com",
            password_hash="hash",
            full_name="Activate User",
        )
        user.suspend()
        user.activate()
        assert user.status == UserStatus.ACTIVE

    def test_activate_pending_user(self) -> None:
        """Test that activate() can move PENDING to ACTIVE."""
        user = User.create(
            email="pending@example.com",
            password_hash="hash",
            full_name="Pending To Active",
        )
        assert user.status == UserStatus.PENDING_VERIFICATION
        user.activate()
        assert user.status == UserStatus.ACTIVE

    def test_suspend_already_suspended_user(self) -> None:
        """Test that suspend() is idempotent on already suspended user."""
        user = User.create(
            email="alreadysuspended@example.com",
            password_hash="hash",
            full_name="Already Suspended",
        )
        user.suspend()
        original_status = user.status
        user.suspend()
        assert user.status == original_status


class TestUserLoginTracking:
    """Test login tracking functionality."""

    def test_update_last_login_sets_timestamp(self) -> None:
        """Test that update_last_login() sets timestamp."""
        user = User.create(
            email="logintime@example.com",
            password_hash="hash",
            full_name="Login Time User",
        )
        assert user.last_login_at is None
        user.update_last_login()
        assert isinstance(user.last_login_at, datetime)
        assert user.last_login_at <= datetime.now(UTC)

    def test_update_last_login_sets_ip_when_provided(self) -> None:
        """Test that update_last_login() stores IP when provided."""
        user = User.create(
            email="loginip@example.com",
            password_hash="hash",
            full_name="Login IP User",
        )
        ip = "192.168.1.1"
        user.update_last_login(ip=ip)
        assert user.last_login_ip == ip

    def test_update_last_login_only_updates_ip_when_provided(self) -> None:
        """Test that update_last_login() sets IP only when provided."""
        user = User.create(
            email="keepip@example.com",
            password_hash="hash",
            full_name="Keep IP User",
        )
        user.update_last_login(ip="192.168.1.100")
        user.update_last_login()
        assert user.last_login_ip is None


class TestUserEdgeCases:
    """Test edge cases and validations."""

    def test_user_factory_creates_unique_ids(self) -> None:
        """Test that factory creates unique UUIDs for each user."""
        user1 = User.create(
            email="user1@example.com",
            password_hash="hash1",
            full_name="User 1",
        )
        user2 = User.create(
            email="user2@example.com",
            password_hash="hash2",
            full_name="User 2",
        )
        assert user1.id != user2.id
        assert isinstance(user1.id, UUID)
        assert isinstance(user2.id, UUID)

    def test_user_factory_creates_unique_timestamps(self) -> None:
        """Test that factory creates slightly different timestamps."""
        import time

        user1 = User.create(
            email="time1@example.com",
            password_hash="hash1",
            full_name="User 1",
        )
        time.sleep(0.01)
        user2 = User.create(
            email="time2@example.com",
            password_hash="hash2",
            full_name="User 2",
        )
        assert user2.created_at > user1.created_at
        assert user2.updated_at > user1.updated_at

    def test_oauth_user_can_login(self) -> None:
        """Test that OAuth users can login (verified, no password)."""
        user = User.create_oauth(
            email="oauthuser@example.com",
            full_name="OAuth User",
        )
        assert user.email_verified is True
        assert user.status == UserStatus.ACTIVE
        assert user.can_login() is True

    def test_regular_user_has_password(self) -> None:
        """Test that regular users have password_hash."""
        user = User.create(
            email="haspassword@example.com",
            password_hash="hashed",
            full_name="Has Password",
        )
        assert user.password_hash == "hashed"


# test
