"""Appointment conflict detection service.

This service is responsible for detecting scheduling conflicts for appointments.
It follows Clean Architecture principles as a domain service with no external dependencies.
"""

from datetime import UTC, datetime, timedelta
from enum import StrEnum

from prosell.domain.base import ValueObject
from prosell.domain.entities.appointment import Appointment, AppointmentStatus


class ConflictType(StrEnum):
    """Types of appointment conflicts."""

    ORG_UNAVAILABLE = "org_unavailable"
    # Future conflict types can be added here (e.g., VEHICLE_UNAVAILABLE, ROOM_UNAVAILABLE)


class Conflict(ValueObject):
    """Value object representing a scheduling conflict.

    Attributes:
        type: The type of conflict detected
        existing_appointment: The appointment that causes the conflict
        message: Human-readable description of the conflict
    """

    type: ConflictType
    existing_appointment: Appointment
    message: str


class AppointmentConflictDetector:
    """
    Domain service for detecting appointment scheduling conflicts.

    This service encapsulates the logic for determining if a new appointment
    conflicts with existing appointments. It follows Clean Architecture by
    being a pure domain service with no external dependencies.

    Conflict detection rules:
    - Same organization (tenant_id) + overlapping time = conflict
    - Cancelled/completed appointments don't cause conflicts
    - Time overlap uses strict inequality (boundaries don't count)
    """

    @staticmethod
    def _normalize_datetime(value: datetime) -> datetime:
        """Normalize datetimes to UTC-aware values for safe comparison."""
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

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
            # Skip if different organization (no conflict) — compares
            # tenant_id because the rule `ORG_UNAVAILABLE` is per-organization:
            # any user in the same org competing for the same slot is a conflict.
            if appointment.tenant_id != existing_app.tenant_id:
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
                        type=ConflictType.ORG_UNAVAILABLE,
                        existing_appointment=existing_app,
                        message="Organization already has appointment at this time",
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
        normalized_start1 = self._normalize_datetime(start1)
        normalized_start2 = self._normalize_datetime(start2)
        normalized_end2 = self._normalize_datetime(end2)
        end1 = normalized_start1 + duration

        # Check for overlap using strict inequality
        # Two ranges [start1, end1) and [start2, end2) overlap iff:
        # start1 < end2 AND start2 < end1
        return normalized_start1 < normalized_end2 and normalized_start2 < end1
