"""Email service port (secondary interface)."""

from abc import abstractmethod
from collections.abc import Awaitable
from datetime import datetime
from typing import NotRequired, Protocol, TypedDict
from uuid import UUID

from prosell.domain.entities.appointment import AppointmentStatus


class AppointmentReminderDetails(TypedDict):
    """Structured payload for appointment reminder emails."""

    buyer_name: NotRequired[str]
    branch_name: NotRequired[str]
    vehicle_info: NotRequired[str]
    scheduled_at: NotRequired[datetime]
    notes: NotRequired[str | None]


class AbstractEmailService(Protocol):
    """
    Email service interface.

    This is a secondary port in Clean Architecture.
    The infrastructure layer implements this adapter.
    """

    @abstractmethod
    def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> Awaitable[None]:
        """Send email verification email."""
        ...

    @abstractmethod
    def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> Awaitable[None]:
        """Send password reset email."""
        ...

    @abstractmethod
    def send_2fa_enabled(
        self,
        email: str,
    ) -> Awaitable[None]:
        """Send 2FA enabled notification."""
        ...

    @abstractmethod
    def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> Awaitable[None]:
        """Send appointment confirmation email to buyer."""
        ...

    @abstractmethod
    def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> Awaitable[None]:
        """Send appointment status update (confirmed/cancelled) to buyer."""
        ...

    @abstractmethod
    def send_appointment_reminder(
        self,
        email: str,
        person_type: str,
        appointment_details: AppointmentReminderDetails,
    ) -> Awaitable[None]:
        """Send appointment reminder."""
        ...

    @abstractmethod
    def send_team_invitation(
        self,
        email: str,
        team_name: str,
        inviter_name: str,
        invitation_token: str,
        role: str,
    ) -> Awaitable[None]:
        """Send team invitation email."""
        ...

    @abstractmethod
    def send_org_invitation(
        self,
        email: str,
        organization_name: str,
        inviter_name: str,
        invitation_token: str,
    ) -> Awaitable[None]:
        """Send organization-owner organization invitation email."""
        ...
