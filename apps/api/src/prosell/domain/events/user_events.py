"""Domain events related to users."""

from typing import Any
from uuid import UUID

from prosell.domain.base import DomainEvent


class UserRegisteredEvent(DomainEvent):
    """Event fired when a new user registers."""

    user_id: UUID
    email: str
    full_name: str
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class UserLoggedInEvent(DomainEvent):
    """Event fired when a user logs in."""

    user_id: UUID
    email: str
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class UserEmailVerifiedEvent(DomainEvent):
    """Event fired when user email is verified."""

    user_id: UUID
    email: str
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class UserPasswordResetEvent(DomainEvent):
    """Event fired when user resets password."""

    user_id: UUID
    email: str
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class User2FAEnabledEvent(DomainEvent):
    """Event fired when user enables 2FA."""

    user_id: UUID
    email: str
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class User2FADisabledEvent(DomainEvent):
    """Event fired when user disables 2FA."""

    user_id: UUID
    email: str
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory


class UserSessionCreatedEvent(DomainEvent):
    """Event fired when a new session is created."""

    user_id: UUID
    session_id: UUID
    ip_address: str | None = None
    user_agent: str | None = None
    metadata: dict[str, Any] | None = None
    # timestamp inherited from DomainEvent with default factory
