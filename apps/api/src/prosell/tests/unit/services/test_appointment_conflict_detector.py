"""Unit tests for AppointmentConflictDetector domain service.

This test suite verifies the conflict detection logic for appointments,
including time overlap calculations and conflict resolution strategies.
"""

from datetime import UTC, datetime, timedelta

from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.services.appointment_conflict_detector import (
    AppointmentConflictDetector,
    Conflict,
    ConflictType,
)


class TestTimesOverlap:
    """Test suite for times_overlap method.

    Verifies time overlap detection with strict boundary rules.
    Uses strict inequality: boundaries touching don't count as overlap.
    """

    def test_times_overlap_no_overlap_before(self):
        """Test that appointments before each other don't overlap.

        9:00-10:00 AM vs 10:00-11:00 AM → False (boundaries touch)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is False, "Appointments with touching boundaries should not overlap"

    def test_times_overlap_no_overlap_after(self):
        """Test that appointments after each other don't overlap.

        10:00-11:00 AM vs 9:00-10:00 AM → False (boundaries touch)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is False, "Appointments with touching boundaries should not overlap"

    def test_times_overlap_start_inside(self):
        """Test overlap when start time is inside existing appointment.

        9:30-10:30 AM vs 9:00-11:00 AM → True (start inside)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 9, 30, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is True, "Appointment starting inside another should overlap"

    def test_times_overlap_end_inside(self):
        """Test overlap when end time is inside existing appointment.

        9:00-10:00 AM vs 9:30-10:30 AM → True (end inside)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 9, 30, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 10, 30, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is True, "Appointment ending inside another should overlap"

    def test_times_overlap_complete_containment(self):
        """Test overlap when one appointment completely contains another.

        9:30-10:30 AM vs 9:00-11:00 AM → True (complete containment)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 9, 30, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is True, "Complete containment should overlap"

    def test_times_overlap_boundary_touching(self):
        """Test that boundaries touching don't count as overlap.

        9:00-10:00 AM vs 10:00-11:00 AM → False (strict inequality)
        """
        detector = AppointmentConflictDetector()
        start1 = datetime(2026, 5, 19, 9, 0, tzinfo=UTC)
        duration = timedelta(hours=1)
        start2 = datetime(2026, 5, 19, 10, 0, tzinfo=UTC)
        end2 = datetime(2026, 5, 19, 11, 0, tzinfo=UTC)

        result = detector.times_overlap(start1, duration, start2, end2)

        assert result is False, "Touching boundaries should not overlap (strict inequality)"


class TestDetectConflicts:
    """Test suite for detect_conflicts method.

    Verifies conflict detection logic including organization assignment,
    time overlap, and appointment status filtering.
    """

    def test_detect_conflicts_different_organization_no_conflict(self):
        """Test that different organizations don't cause conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization1_id = uuid4()
        organization2_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization1_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        existing_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),  # Different lead
            user_id=organization2_id,  # Different organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),  # Same time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [existing_appointment])

        assert len(conflicts) == 0, "Different organizations should not cause conflicts"

    def test_detect_conflicts_different_time_no_conflict(self):
        """Test that different times don't cause conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 9, 0, tzinfo=UTC),  # 9 AM
            status=AppointmentStatus.SCHEDULED,
        )

        existing_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,  # Same organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 11, 0, tzinfo=UTC),  # 11 AM
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [existing_appointment])

        assert len(conflicts) == 0, "Different times should not cause conflicts"

    def test_detect_conflicts_cancelled_appointment_no_conflict(self):
        """Test that cancelled appointments don't cause conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        cancelled_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,  # Same organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),  # Same time
            status=AppointmentStatus.CANCELLED,  # Cancelled
        )

        conflicts = detector.detect_conflicts(new_appointment, [cancelled_appointment])

        assert len(conflicts) == 0, "Cancelled appointments should not cause conflicts"

    def test_detect_conflicts_completed_appointment_no_conflict(self):
        """Test that completed appointments don't cause conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        completed_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,  # Same organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),  # Same time
            status=AppointmentStatus.COMPLETED,  # Completed
        )

        conflicts = detector.detect_conflicts(new_appointment, [completed_appointment])

        assert len(conflicts) == 0, "Completed appointments should not cause conflicts"

    def test_detect_conflicts_same_organization_same_time_conflict(self):
        """Test that same organization + same time causes conflict."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        existing_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,  # Same organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),  # Same time
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [existing_appointment])

        assert len(conflicts) == 1, "Same organization + same time should cause conflict"
        assert conflicts[0].type == ConflictType.ORG_UNAVAILABLE
        assert conflicts[0].existing_appointment == existing_appointment

    def test_detect_conflicts_time_overlap_conflict(self):
        """Test that overlapping times cause conflict."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 9, 30, tzinfo=UTC),  # 9:30 AM
            status=AppointmentStatus.SCHEDULED,
        )

        existing_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,  # Same organization
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 9, 0, tzinfo=UTC),  # 9:00 AM
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [existing_appointment])

        assert len(conflicts) == 1, "Overlapping times should cause conflict"
        assert conflicts[0].type == ConflictType.ORG_UNAVAILABLE

    def test_detect_conflicts_multiple_conflicts(self):
        """Test detection of multiple conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        organization_id = uuid4()
        lead_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        existing1 = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 9, 30, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        existing2 = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=uuid4(),
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 30, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [existing1, existing2])

        assert len(conflicts) == 2, "Should detect multiple conflicts"

    def test_detect_conflicts_empty_list_no_conflict(self):
        """Test that empty existing appointments list causes no conflicts."""
        from uuid import uuid4

        detector = AppointmentConflictDetector()
        lead_id = uuid4()
        organization_id = uuid4()
        product_id = uuid4()
        tenant_id = uuid4()

        new_appointment = Appointment(
            id=uuid4(),
            tenant_id=tenant_id,
            lead_id=lead_id,
            user_id=organization_id,
            product_id=product_id,
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        conflicts = detector.detect_conflicts(new_appointment, [])

        assert len(conflicts) == 0, "Empty list should have no conflicts"


class TestConflictValueObject:
    """Test suite for Conflict value object."""

    def test_conflict_value_object_creation(self):
        """Test Conflict value object creation and properties."""
        from uuid import uuid4

        existing_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=uuid4(),
            product_id=uuid4(),
            scheduled_at=datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            status=AppointmentStatus.SCHEDULED,
        )

        conflict = Conflict(
            type=ConflictType.ORG_UNAVAILABLE,
            existing_appointment=existing_appointment,
            message="Test conflict message",
        )

        assert conflict.type == ConflictType.ORG_UNAVAILABLE
        assert conflict.existing_appointment == existing_appointment
        assert conflict.message == "Test conflict message"
        assert "org_unavailable" in repr(conflict)

    def test_conflict_type_enum(self):
        """Test ConflictType enum values."""
        assert ConflictType.ORG_UNAVAILABLE.value == "org_unavailable"
        assert isinstance(ConflictType.ORG_UNAVAILABLE.value, str)
