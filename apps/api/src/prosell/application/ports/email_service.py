"""Email service port (secondary interface)."""

from abc import abstractmethod
from datetime import datetime
from typing import Protocol
from uuid import UUID

from prosell.domain.entities.appointment import AppointmentStatus


class AbstractEmailService(Protocol):
    """
    Email service interface.

    This is a secondary port in Clean Architecture.
    The infrastructure layer implements this (Adapter).
    """

    @abstractmethod
    async def send_verification_email(
        self,
        email: str,
        user_id: UUID,
        token: str,
    ) -> None:
        """Send email verification email."""
        ...

    @abstractmethod
    async def send_password_reset(
        self,
        email: str,
        token: str,
    ) -> None:
        """Send password reset email."""
        ...

    @abstractmethod
    async def send_2fa_enabled(
        self,
        email: str,
    ) -> None:
        """Send 2FA enabled notification."""
        ...

    @abstractmethod
    async def send_appointment_confirmation(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        notes: str | None = None,
    ) -> None:
        """Send appointment confirmation email to buyer."""
        ...

    @abstractmethod
    async def send_appointment_status_update(
        self,
        buyer_email: str,
        buyer_name: str,
        branch_name: str,
        vehicle_info: str,
        scheduled_at: datetime,
        new_status: AppointmentStatus,
        notes: str | None = None,
    ) -> None:
        """Send appointment status update (confirmed/cancelled) to buyer."""
        ...

    @abstractmethod
    async def send_appointment_reminder(
        self,
        email: str,
        person_type: str,  # "branch" or "buyer"
        appointment_details: dict[str, Any],
    ) -> None:
        """Send appointment reminder."""
        ...
