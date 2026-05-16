"""Appointment conflict detection service.

This service is responsible for detecting scheduling conflicts for appointments.
It follows Clean Architecture principles as a domain service with no external dependencies.
"""

from datetime import datetime, timedelta
from enum import StrEnum

from prosell.domain.entities.appointment import Appointment, AppointmentStatus


class ConflictType(StrEnum):
    """Types of appointment conflicts."""

    DEALER_UNAVAILABLE = "dealer_unavailable"
    # Future conflict types can be added here (e.g., VEHICLE_UNAVAILABLE, ROOM_UNAVAILABLE)


class Conflict:
    """Value object representing a scheduling conflict.

    Attributes:
        type: The type of conflict detected
        existing_appointment: The appointment that causes the conflict
        message: Human-readable description of the conflict
    """

    def __init__(
        self,
        type: ConflictType,
        existing_appointment: Appointment,
        message: str,
    ) -> None:
        """Initialize a conflict.

        Args:
            type: The type of conflict
            existing_appointment: The conflicting appointment
            message: Human-readable description
        """
        self.type = type
        self.existing_appointment = existing_appointment
        self.message = message

    def __repr__(self) -> str:
        """Return string representation of conflict."""
        return f"Conflict(type={self.type}, message={self.message})"


class AppointmentConflictDetector:
    """
    Domain service for detecting appointment scheduling conflicts.

    This service encapsulates the logic for determining if a new appointment
    conflicts with existing appointments. It follows Clean Architecture by
    being a pure domain service with no external dependencies.

    Conflict detection rules:
    - Same dealer + overlapping time = conflict
    - Cancelled/completed appointments don't cause conflicts
    - Time overlap uses strict inequality (boundaries don't count)
    """

    def detect_conflicts(
        self,
        appointment: Appointment,
        existing_appointments: list[Appointment],
    ) -> list[Conflict]:
        """
        Detect conflicts between a new appointment and existing appointments.

        Args:
            appointment: The new appointment to check
            existing_appointments: List of existing appointments to check against

        Returns:
            List of conflicts detected (empty if no conflicts)

        Example:
            >>> detector = AppointmentConflictDetector()
            >>> conflicts = detector.detect_conflicts(new_appointment, existing_appointments)
            >>> if conflicts:
            ...     for conflict in conflicts:
            ...         print(f"Conflict: {conflict.message}")
        """
        conflicts: list[Conflict] = []

        for existing_app in existing_appointments:
            # Skip if different dealer (no conflict)
            if appointment.user_id != existing_app.user_id:
                continue

            # Skip if existing appointment is not scheduled (cancelled/completed don't conflict)
            if existing_app.status != AppointmentStatus.SCHEDULED:
                continue

            # Check for time overlap
            # Assume 1-hour duration for appointments (can be made configurable later)
            duration = timedelta(hours=1)
            if self.times_overlap(
                appointment.scheduled_at,
                duration,
                existing_app.scheduled_at,
                existing_app.scheduled_at + duration,
            ):
                conflicts.append(
                    Conflict(
                        type=ConflictType.DEALER_UNAVAILABLE,
                        existing_appointment=existing_app,
                        message="Dealer already has appointment at this time",
                    )
                )

        return conflicts

    def times_overlap(
        self,
        start1: datetime,
        duration: timedelta,
        start2: datetime,
        end2: datetime,
    ) -> bool:
        """
        Check if two time ranges overlap.

        Uses strict inequality: boundaries touching don't count as overlap.
        This means an appointment ending at 10:00 AM doesn't conflict with
        one starting at 10:00 AM.

        Args:
            start1: Start time of first range
            duration: Duration of first range
            start2: Start time of second range
            end2: End time of second range

        Returns:
            True if ranges overlap, False otherwise

        Example:
            >>> detector = AppointmentConflictDetector()
            >>> # 9:00-10:00 AM and 10:00-11:00 AM - no overlap (boundaries touch)
            >>> detector.times_overlap(
            ...     datetime(2026, 5, 19, 9, 0),
            ...     timedelta(hours=1),
            ...     datetime(2026, 5, 19, 10, 0),
            ...     datetime(2026, 5, 19, 11, 0)
            ... )
            False
        """
        end1 = start1 + duration

        # Check for overlap using strict inequality
        # Two ranges [start1, end1) and [start2, end2) overlap iff:
        # start1 < end2 AND start2 < end1
        return start1 < end2 and start2 < end1
