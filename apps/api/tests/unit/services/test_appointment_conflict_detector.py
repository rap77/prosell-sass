"""Unit tests for AppointmentConflictDetector service."""

from datetime import UTC, datetime, timedelta

import pytest

from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.services.appointment_conflict_detector import (
    AppointmentConflictDetector,
    Conflict,
    ConflictType,
)


@pytest.fixture
def conflict_detector() -> AppointmentConflictDetector:
    """Create conflict detector instance."""
    return AppointmentConflictDetector()


@pytest.fixture
def base_time() -> datetime:
    """Base time for testing (Tuesday, 2 PM UTC)."""
    return datetime(2026, 5, 19, 14, 0, tzinfo=UTC)  # Tuesday


@pytest.fixture
def existing_appointment(
    base_time: datetime,
) -> Appointment:
    """Create an existing appointment for testing conflicts."""
    return Appointment(
        id="existing-1",
        tenant_id="tenant-1",
        lead_id="lead-1",
        user_id="dealer-1",
        product_id="product-1",
        scheduled_at=base_time,
        status=AppointmentStatus.SCHEDULED,
        notes="Existing appointment",
    )


class TestTimesOverlap:
    """Test time overlap detection logic."""

    def test_no_overlap_before(self, conflict_detector: AppointmentConflictDetector):
        """Test appointments that don't overlap (before)."""
        start1 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 8, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)

        assert not conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_no_overlap_after(self, conflict_detector: AppointmentConflictDetector):
        """Test appointments that don't overlap (after)."""
        start1 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 13, 0, tzinfo=UTC)

        assert not conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_overlap_start_inside(self, conflict_detector: AppointmentConflictDetector):
        """Test overlap when new appointment starts inside existing."""
        start1 = datetime(2026, 5, 19, 10, 30, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)

        assert conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_overlap_end_inside(self, conflict_detector: AppointmentConflictDetector):
        """Test overlap when new appointment ends inside existing."""
        start1 = datetime(2026, 5, 19, 9, 30, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)

        assert conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_overlap_complete_containment(
        self, conflict_detector: AppointmentConflictDetector
    ):
        """Test overlap when new appointment completely contains existing."""
        start1 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        duration = timedelta(hours=3)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)

        assert conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_overlap_complete_containment_reverse(
        self, conflict_detector: AppointmentConflictDetector
    ):
        """Test overlap when existing appointment completely contains new."""
        start1 = datetime(2026, 5, 19, 10, 30, tzinfo=UTC)
        duration = timedelta(minutes=30)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)

        assert conflict_detector.times_overlap(start1, duration, start2, end2)

    def test_exact_boundary_no_overlap(
        self, conflict_detector: AppointmentConflictDetector
    ):
        """Test that exact boundaries don't count as overlap."""
        start1 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 12, 0, tzinfo=UTC)

        # End of new (11:00) == start of existing (11:00) - no overlap
        assert not conflict_detector.times_overlap(start1, duration, start2, end2)


class TestDetectConflicts:
    """Test conflict detection for appointments."""

    def test_no_conflicts_different_dealer(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test no conflict when different dealer."""
        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-2",  # Different dealer
            product_id="product-2",
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 0

    def test_no_conflicts_different_time(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test no conflict when different time."""
        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",  # Same dealer
            product_id="product-2",
            scheduled_at=base_time + timedelta(hours=3),  # Different time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 0

    def test_no_conflicts_cancelled_appointment(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test no conflict when existing appointment is cancelled."""
        # Mark existing as cancelled
        existing_appointment.status = AppointmentStatus.CANCELLED

        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",
            product_id="product-2",
            scheduled_at=base_time,  # Same time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 0

    def test_no_conflicts_completed_appointment(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test no conflict when existing appointment is completed."""
        # Mark existing as completed
        existing_appointment.status = AppointmentStatus.COMPLETED

        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",
            product_id="product-2",
            scheduled_at=base_time,  # Same time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 0

    def test_conflict_detected_same_dealer_same_time(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test conflict detected for same dealer and time."""
        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",  # Same dealer
            product_id="product-2",
            scheduled_at=base_time,  # Same time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 1
        assert conflicts[0].type == ConflictType.DEALER_UNAVAILABLE
        assert conflicts[0].existing_appointment == existing_appointment
        assert "already has appointment" in conflicts[0].message.lower()

    def test_conflict_detected_time_overlap(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test conflict detected when times overlap."""
        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",  # Same dealer
            product_id="product-2",
            scheduled_at=base_time + timedelta(minutes=30),  # 30 min later
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment]
        )

        assert len(conflicts) == 1
        assert conflicts[0].type == ConflictType.DEALER_UNAVAILABLE

    def test_multiple_conflicts_detected(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
        existing_appointment: Appointment,
    ):
        """Test multiple conflicts detected."""
        # Create multiple existing appointments
        existing_2 = Appointment(
            id="existing-2",
            tenant_id="tenant-1",
            lead_id="lead-3",
            user_id="dealer-1",  # Same dealer
            product_id="product-3",
            scheduled_at=base_time + timedelta(minutes=30),  # 30 min later - overlaps
            status=AppointmentStatus.SCHEDULED,
        )

        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",  # Same dealer
            product_id="product-2",
            scheduled_at=base_time,  # Conflicts with both
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(
            new_appointment, [existing_appointment, existing_2]
        )

        assert len(conflicts) == 2

    def test_empty_existing_list(
        self,
        conflict_detector: AppointmentConflictDetector,
        base_time: datetime,
    ):
        """Test with no existing appointments."""
        new_appointment = Appointment(
            id="new-1",
            tenant_id="tenant-1",
            lead_id="lead-2",
            user_id="dealer-1",
            product_id="product-2",
            scheduled_at=base_time,
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = conflict_detector.detect_conflicts(new_appointment, [])

        assert len(conflicts) == 0


class TestConflictValueObject:
    """Test Conflict value object."""

    def test_conflict_creation(self):
        """Test creating a conflict object."""
        existing = Appointment(
            id="existing-1",
            tenant_id="tenant-1",
            lead_id="lead-1",
            user_id="dealer-1",
            product_id="product-1",
            scheduled_at=datetime(2026, 5, 19, 14, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        conflict = Conflict(
            type=ConflictType.DEALER_UNAVAILABLE,
            existing_appointment=existing,
            message="Dealer already has appointment at this time",
        )

        assert conflict.type == ConflictType.DEALER_UNAVAILABLE
        assert conflict.existing_appointment == existing
        assert conflict.message == "Dealer already has appointment at this time"
