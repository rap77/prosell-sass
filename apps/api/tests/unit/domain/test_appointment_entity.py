"""Unit tests for Appointment entity - TDD approach."""

import pytest
from datetime import datetime, UTC, timedelta
from uuid import uuid4

from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentTimeValidationException,
)


class TestAppointmentStatus:
    """Test AppointmentStatus enum."""

    def test_status_values(self):
        """Test that all status values are defined correctly."""
        assert AppointmentStatus.SCHEDULED == "scheduled"
        assert AppointmentStatus.COMPLETED == "completed"
        assert AppointmentStatus.CANCELLED == "cancelled"

    def test_is_terminal_status(self):
        """Test terminal status detection."""
        assert AppointmentStatus.CANCELLED.is_terminal() is True
        assert AppointmentStatus.COMPLETED.is_terminal() is True
        assert AppointmentStatus.SCHEDULED.is_terminal() is False


class TestAppointment:
    """Test Appointment entity."""

    def test_create_appointment_minimal(self):
        """Test creating appointment with minimal fields."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.id is not None
        assert appointment.lead_id == lead_id
        assert appointment.dealer_id == dealer_id
        assert appointment.vehicle_id == vehicle_id
        assert appointment.tenant_id == tenant_id
        assert appointment.scheduled_at == scheduled_at
        assert appointment.status == AppointmentStatus.SCHEDULED
        assert appointment.notes is None
        assert appointment.created_at is not None
        assert appointment.updated_at is not None

    def test_create_appointment_with_notes(self):
        """Test creating appointment with notes."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am
        notes = "Buyer interested in test drive"

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
            notes=notes,
        )

        assert appointment.notes == notes

    def test_business_hours_validation_weekday_in_range(self):
        """Test business hours validation - weekday within 9am-6pm."""
        # Tuesday 10am (valid)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.scheduled_at == scheduled_at

    def test_business_hours_validation_weekday_before_9am(self):
        """Test business hours validation - weekday before 9am should fail."""
        # Tuesday 8am (invalid)
        scheduled_at = datetime(2026, 4, 29, 8, 0, 0, tzinfo=UTC)  # Tuesday
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()

        with pytest.raises(AppointmentTimeValidationException) as exc_info:
            Appointment.create(
                lead_id=lead_id,
                dealer_id=dealer_id,
                vehicle_id=vehicle_id,
                tenant_id=tenant_id,
                scheduled_at=scheduled_at,
            )

        assert "between" in str(exc_info.value).lower()
        assert "09:00" in str(exc_info.value) or "9:00" in str(exc_info.value)

    def test_business_hours_validation_weekday_after_6pm(self):
        """Test business hours validation - weekday after 6pm should fail."""
        # Tuesday 7pm (invalid)
        scheduled_at = datetime(2026, 4, 29, 19, 0, 0, tzinfo=UTC)  # Tuesday
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()

        with pytest.raises(AppointmentTimeValidationException) as exc_info:
            Appointment.create(
                lead_id=lead_id,
                dealer_id=dealer_id,
                vehicle_id=vehicle_id,
                tenant_id=tenant_id,
                scheduled_at=scheduled_at,
            )

        assert "between" in str(exc_info.value).lower()
        assert "06:00" in str(exc_info.value) or "6:00" in str(exc_info.value)

    def test_business_hours_validation_weekend(self):
        """Test business hours validation - weekend should fail."""
        # Saturday 10am (invalid)
        scheduled_at = datetime(2026, 5, 2, 10, 0, 0, tzinfo=UTC)  # Saturday
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()

        with pytest.raises(AppointmentTimeValidationException) as exc_info:
            Appointment.create(
                lead_id=lead_id,
                dealer_id=dealer_id,
                vehicle_id=vehicle_id,
                tenant_id=tenant_id,
                scheduled_at=scheduled_at,
            )

        assert "weekend" in str(exc_info.value).lower() or "outside business hours" in str(exc_info.value).lower()

    def test_conflict_detection_same_dealer_same_time(self):
        """Test conflict detection - same dealer, same time slot."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        # Create first appointment
        appointment1 = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        # Try to create conflicting appointment
        lead_id_2 = uuid4()
        vehicle_id_2 = uuid4()

        with pytest.raises(AppointmentConflictException) as exc_info:
            Appointment.create(
                lead_id=lead_id_2,
                dealer_id=dealer_id,  # Same dealer
                vehicle_id=vehicle_id_2,
                tenant_id=tenant_id,
                scheduled_at=scheduled_at,  # Same time
                existing_appointments=[appointment1],  # Pass existing appointments
            )

        assert "already has an appointment" in str(exc_info.value).lower()

    def test_conflict_detection_different_dealer_same_time(self):
        """Test conflict detection - different dealer, same time should succeed."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)

        # Create first appointment
        appointment1 = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        # Create second appointment with different dealer
        lead_id_2 = uuid4()
        dealer_id_2 = uuid4()
        vehicle_id_2 = uuid4()

        # Should not raise - different dealer
        appointment2 = Appointment.create(
            lead_id=lead_id_2,
            dealer_id=dealer_id_2,  # Different dealer
            vehicle_id=vehicle_id_2,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
            existing_appointments=[appointment1],
        )

        assert appointment2.dealer_id == dealer_id_2

    def test_cancel_appointment(self):
        """Test cancelling an appointment."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.status == AppointmentStatus.SCHEDULED

        appointment.cancel()

        assert appointment.status == AppointmentStatus.CANCELLED
        assert appointment.updated_at > appointment.created_at

    def test_complete_appointment(self):
        """Test completing an appointment."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.status == AppointmentStatus.SCHEDULED

        appointment.complete()

        assert appointment.status == AppointmentStatus.COMPLETED
        assert appointment.updated_at > appointment.created_at

    def test_is_cancelled(self):
        """Test is_cancelled method."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.is_cancelled() is False

        appointment.cancel()
        assert appointment.is_cancelled() is True

    def test_is_completed(self):
        """Test is_completed method."""
        lead_id = uuid4()
        dealer_id = uuid4()
        vehicle_id = uuid4()
        tenant_id = uuid4()
        # Use a specific business hour time (Tuesday 10am)
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        appointment = Appointment.create(
            lead_id=lead_id,
            dealer_id=dealer_id,
            vehicle_id=vehicle_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )

        assert appointment.is_completed() is False

        appointment.complete()
        assert appointment.is_completed() is True
