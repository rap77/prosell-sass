"""Appointment entity - Pure domain logic with no external dependencies."""

from datetime import UTC, datetime, time, timedelta
from enum import StrEnum
from typing import ClassVar
from uuid import UUID

from pydantic import Field

from prosell.domain.base import DomainModel
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentTimeValidationException,
)


class AppointmentStatus(StrEnum):
    """Appointment lifecycle status.

    Represents the 3-state appointment lifecycle:
    - SCHEDULED: Initial state when appointment is created
    - COMPLETED: Appointment was completed (terminal state)
    - CANCELLED: Appointment was cancelled (terminal state)
    """

    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

    def is_terminal(self) -> bool:
        """Check if status is terminal (no further transitions possible)."""
        return self in (self.COMPLETED, self.CANCELLED)

    def __str__(self) -> str:
        return self.value


class Appointment(DomainModel):
    """
    Appointment entity.

    Pure domain logic - no external dependencies.
    All business rules for appointments live here.
    """

    # Identity fields
    id: UUID
    tenant_id: UUID

    # Relationships
    lead_id: UUID
    user_id: UUID
    product_id: UUID

    # Appointment details
    scheduled_at: datetime
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: str | None = None

    # Audit fields
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    # Business hours configuration (class variables)
    BUSINESS_HOUR_START: ClassVar[time] = time(9, 0)  # 9:00 AM
    BUSINESS_HOUR_END: ClassVar[time] = time(18, 0)  # 6:00 PM

    @classmethod
    def create(
        cls,
        lead_id: UUID,
        user_id: UUID,
        product_id: UUID,
        tenant_id: UUID,
        scheduled_at: datetime,
        notes: str | None = None,
        existing_appointments: list["Appointment"] | None = None,
        **kwargs: object,
    ) -> "Appointment":
        """
        Factory method for new appointment creation.

        Args:
            lead_id: Associated lead ID
            user_id: Assigned user ID
            product_id: Associated vehicle ID
            tenant_id: Unique tenant identifier
            scheduled_at: When the appointment is scheduled
            notes: Additional notes (optional)
            existing_appointments: List of existing appointments for conflict detection
            **kwargs: Additional optional fields

        Returns:
            New Appointment entity

        Raises:
            AppointmentTimeValidationException: If time is outside business hours
            AppointmentConflictException: If branch has conflicting appointment
        """
        from uuid import uuid4

        # Validate business hours
        cls._validate_business_hours(scheduled_at)

        # Check for conflicts
        if existing_appointments:
            cls._check_conflicts(user_id, scheduled_at, existing_appointments)

        return cls(
            id=uuid4(),
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
            notes=notes,
            status=AppointmentStatus.SCHEDULED,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            **kwargs,
        )

    @classmethod
    def _validate_business_hours(cls, scheduled_at: datetime) -> None:
        """
        Validate that appointment time is within business hours.

        Business hours: Monday-Friday, 9am-6pm

        Args:
            scheduled_at: Proposed appointment time

        Raises:
            AppointmentTimeValidationException: If time is outside business hours
        """
        # Convert to UTC if needed
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=UTC)

        # Check if weekend (Saturday=5, Sunday=6)
        weekday = scheduled_at.weekday()
        if weekday >= 5:  # Saturday or Sunday
            raise AppointmentTimeValidationException("Appointments cannot be scheduled on weekends")

        # Check if within business hours (9am-6pm)
        appointment_time = scheduled_at.time()
        if not (cls.BUSINESS_HOUR_START <= appointment_time <= cls.BUSINESS_HOUR_END):
            raise AppointmentTimeValidationException(
                f"Appointments must be scheduled between {cls.BUSINESS_HOUR_START.strftime('%I:%M %p')} "  # noqa: E501
                f"and {cls.BUSINESS_HOUR_END.strftime('%I:%M %p')} on weekdays"
            )

    @classmethod
    def _check_conflicts(
        cls,
        user_id: UUID,
        scheduled_at: datetime,
        existing_appointments: list["Appointment"],
    ) -> None:
        """
        Check for conflicting appointments for the same branch.

        Conflict = same branch + same time slot (1-hour window)

        Args:
            user_id: User ID to check
            scheduled_at: Proposed appointment time
            existing_appointments: List of existing appointments

        Raises:
            AppointmentConflictException: If conflict detected
        """
        # Define 1-hour window around scheduled time
        window_start = scheduled_at - timedelta(minutes=30)
        window_end = scheduled_at + timedelta(minutes=30)

        for appointment in existing_appointments:
            # Skip if different branch
            if appointment.user_id != user_id:
                continue

            # Skip if not scheduled status (cancelled/completed don't conflict)
            if appointment.status != AppointmentStatus.SCHEDULED:
                continue

            # Check if time overlaps with 1-hour window
            if window_start <= appointment.scheduled_at <= window_end:
                raise AppointmentConflictException(
                    user_id=str(user_id),
                    scheduled_at=scheduled_at.isoformat(),
                )

    def cancel(self) -> None:
        """
        Cancel the appointment.

        Raises:
            ValueError: If appointment is already cancelled or completed
        """
        if self.status.is_terminal():
            raise ValueError(f"Cannot cancel appointment with status '{self.status.value}'")

        self.status = AppointmentStatus.CANCELLED
        self.updated_at = datetime.now(UTC)

    def complete(self) -> None:
        """
        Mark the appointment as completed.

        Raises:
            ValueError: If appointment is already cancelled or completed
        """
        if self.status.is_terminal():
            raise ValueError(f"Cannot complete appointment with status '{self.status.value}'")

        self.status = AppointmentStatus.COMPLETED
        self.updated_at = datetime.now(UTC)

    def is_cancelled(self) -> bool:
        """Check if appointment is cancelled."""
        return self.status == AppointmentStatus.CANCELLED

    def is_completed(self) -> bool:
        """Check if appointment is completed."""
        return self.status == AppointmentStatus.COMPLETED
