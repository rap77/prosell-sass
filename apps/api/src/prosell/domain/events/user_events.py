"""Domain events related to users."""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class UserRegisteredEvent:
    """Event fired when a new user registers."""

    user_id: UUID
    email: str
    full_name: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class UserLoggedInEvent:
    """Event fired when a user logs in."""

    user_id: UUID
    email: str
    ip_address: str | None = None
    user_agent: str | None = None
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class UserEmailVerifiedEvent:
    """Event fired when user email is verified."""

    user_id: UUID
    email: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class UserPasswordResetEvent:
    """Event fired when user resets password."""

    user_id: UUID
    email: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class User2FAEnabledEvent:
    """Event fired when user enables 2FA."""

    user_id: UUID
    email: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class User2FADisabledEvent:
    """Event fired when user disables 2FA."""

    user_id: UUID
    email: str
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))


@dataclass(frozen=True)
class UserSessionCreatedEvent:
    """Event fired when a new session is created."""

    user_id: UUID
    session_id: UUID
    ip_address: str | None = None
    user_agent: str | None = None
    timestamp: datetime | None = None
    metadata: dict[str, Any] | None = None

    def __post_init__(self):
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.now(UTC))
