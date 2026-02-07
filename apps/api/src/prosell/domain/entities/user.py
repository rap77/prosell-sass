"""User entity - Pure domain logic with no external dependencies."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

if TYPE_CHECKING:
    from prosell.domain.entities.role import Role


class UserStatus(str, Enum):
    """User account status enum."""

    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"


@dataclass
class User:
    """
    User entity.

    Pure domain logic - no external dependencies.
    All business rules for users live here.
    """

    id: UUID
    email: str
    password_hash: str | None  # None for OAuth-only users
    full_name: str
    avatar_url: str | None
    status: UserStatus
    email_verified: bool
    email_verified_at: datetime | None
    is_2fa_enabled: bool
    totp_secret: str | None
    backup_codes: list[str] | None
    last_login_at: datetime | None
    last_login_ip: str | None
    failed_login_attempts: int
    locked_until: datetime | None
    tenant_id: UUID | None
    created_at: datetime
    updated_at: datetime

    # Lazy loaded relationships (not in __init__)
    roles: list["Role"] | None = None

    @classmethod
    def create(
        cls,
        email: str,
        password_hash: str,
        full_name: str,
    ) -> "User":
        """
        Factory method for new user registration.

        Creates a new user in PENDING_VERIFICATION status.
        """
        return cls(
            id=uuid4(),
            email=email,
            password_hash=password_hash,
            full_name=full_name,
            avatar_url=None,
            status=UserStatus.PENDING_VERIFICATION,
            email_verified=False,
            email_verified_at=None,
            is_2fa_enabled=False,
            totp_secret=None,
            backup_codes=None,
            last_login_at=None,
            last_login_ip=None,
            failed_login_attempts=0,
            locked_until=None,
            tenant_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            roles=None,
        )

    @classmethod
    def create_oauth(
        cls,
        email: str,
        full_name: str,
        avatar_url: str | None = None,
    ) -> "User":
        """
        Factory method for OAuth user registration.

        OAuth users have no password and are auto-verified.
        """
        return cls(
            id=uuid4(),
            email=email,
            password_hash=None,
            full_name=full_name,
            avatar_url=avatar_url,
            status=UserStatus.ACTIVE,
            email_verified=True,
            email_verified_at=datetime.now(UTC),
            is_2fa_enabled=False,
            totp_secret=None,
            backup_codes=None,
            last_login_at=None,
            last_login_ip=None,
            failed_login_attempts=0,
            locked_until=None,
            tenant_id=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            roles=None,
        )

    def is_locked(self) -> bool:
        """Check if account is locked due to failed login attempts."""
        if self.locked_until is None:
            return False
        return datetime.now(UTC) < self.locked_until

    def can_login(self) -> bool:
        """Check if user can login (active, verified, not locked)."""
        return self.status == UserStatus.ACTIVE and self.email_verified and not self.is_locked()

    def record_failed_login(
        self,
        max_attempts: int = 5,
        lock_minutes: int = 15,
    ) -> bool:
        """
        Record a failed login attempt.

        Returns True if account should be locked.
        """
        self.failed_login_attempts += 1
        self.updated_at = datetime.now(UTC)

        if self.failed_login_attempts >= max_attempts:
            self.locked_until = datetime.now(UTC) + timedelta(minutes=lock_minutes)
            return True
        return False

    def reset_failed_attempts(self) -> None:
        """Reset failed attempts counter after successful login."""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.updated_at = datetime.now(UTC)

    def verify_email(self) -> None:
        """Mark email as verified."""
        if not self.email_verified:
            self.email_verified = True
            self.email_verified_at = datetime.now(UTC)
            self.status = UserStatus.ACTIVE
            self.updated_at = datetime.now(UTC)

    def enable_2fa(self, totp_secret: str, backup_codes: list[str]) -> None:
        """Enable two-factor authentication."""
        self.is_2fa_enabled = True
        self.totp_secret = totp_secret
        self.backup_codes = backup_codes
        self.updated_at = datetime.now(UTC)

    def disable_2fa(self) -> None:
        """Disable two-factor authentication."""
        self.is_2fa_enabled = False
        self.totp_secret = None
        self.backup_codes = None
        self.updated_at = datetime.now(UTC)

    def use_backup_code(self, code: str) -> bool:
        """
        Use a backup code for 2FA.

        Returns True if code was valid and removed.
        """
        if not self.backup_codes:
            return False

        if code in self.backup_codes:
            self.backup_codes.remove(code)
            self.updated_at = datetime.now(UTC)
            return True
        return False

    def has_role(self, role_type: str) -> bool:
        """Check if user has a specific role."""
        if not self.roles:
            return False
        return any(role.role_type == role_type for role in self.roles)

    def suspend(self) -> None:
        """Suspend user account."""
        self.status = UserStatus.SUSPENDED
        self.updated_at = datetime.now(UTC)

    def activate(self) -> None:
        """Activate user account."""
        self.status = UserStatus.ACTIVE
        self.updated_at = datetime.now(UTC)

    def update_last_login(self, ip: str | None = None) -> None:
        """Update last login information."""
        self.last_login_at = datetime.now(UTC)
        self.last_login_ip = ip
        self.updated_at = datetime.now(UTC)
