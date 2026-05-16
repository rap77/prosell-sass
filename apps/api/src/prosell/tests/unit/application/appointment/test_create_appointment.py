"""Integration tests for CreateAppointmentUseCase with conflict detection.

This test suite verifies the integration between the use case and the
conflict detection service, including force override functionality.
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.use_cases.appointment.create_appointment import (
    CreateAppointmentUseCase,
)
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
)
from prosell.domain.services.appointment_conflict_detector import (
    AppointmentConflictDetector,
    ConflictType,
)


class TestCreateAppointmentConflictDetection:
    """Test suite for appointment creation with conflict detection.

    Verifies the integration between CreateAppointmentUseCase and
    AppointmentConflictDetector, including the force override feature.
    """

    @pytest.fixture
    def mock_appointment_repo(self):
        """Create mock appointment repository."""
        repo = AsyncMock()
        repo.create = AsyncMock()
        repo.check_conflicts = AsyncMock(return_value=[])
        return repo

    @pytest.fixture
    def mock_lead_repo(self):
        """Create mock lead repository."""
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)
        repo.update_status = AsyncMock()
        return repo

    @pytest.fixture
    def conflict_detector(self):
        """Create real conflict detector (not mocked)."""
        return AppointmentConflictDetector()

    @pytest.fixture
    def use_case(
        self, mock_appointment_repo, mock_lead_repo, conflict_detector
    ):
        """Create use case with mocked repositories."""
        return CreateAppointmentUseCase(
            appointment_repository=mock_appointment_repo,
            lead_repository=mock_lead_repo,
            conflict_detector=conflict_detector,
        )

    @pytest.fixture
    def valid_request_data(self):
        """Create valid appointment request data."""
        return {
            "lead_id": uuid4(),
            "user_id": uuid4(),
            "product_id": uuid4(),
            "scheduled_at": datetime(2026, 5, 19, 10, 0, tzinfo=UTC),
            "notes": "Test appointment",
        }

    async def test_create_appointment_no_conflicts_success(
        self, use_case, mock_appointment_repo, _mock_lead_repo, valid_request_data
    ):
        """Test successful appointment creation when no conflicts exist."""
        # Setup: No existing appointments
        mock_appointment_repo.check_conflicts.return_value = []

        # Create mock appointment for repository response
        mock_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=valid_request_data["lead_id"],
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],
            notes=valid_request_data["notes"],
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = mock_appointment

        # Execute
        request = CreateAppointmentRequest(**valid_request_data)
        tenant_id = uuid4()

        response = await use_case.execute(request, tenant_id)

        # Verify
        assert response is not None
        mock_appointment_repo.create.assert_called_once()
        # Note: update_status may or may not be called depending on lead state
        # (if lead doesn't exist or can't transition, update is skipped gracefully)

    async def test_create_appointment_with_conflicts_returns_error(
        self, use_case, mock_appointment_repo, valid_request_data
    ):
        """Test that conflicts raise AppointmentConflictException."""
        # Setup: Create conflicting appointment
        conflicting_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=valid_request_data["user_id"],  # Same dealer
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],  # Same time
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.check_conflicts.return_value = [
            conflicting_appointment
        ]

        # Execute & Verify
        request = CreateAppointmentRequest(**valid_request_data)
        tenant_id = uuid4()

        with pytest.raises(AppointmentConflictException) as exc_info:
            await use_case.execute(request, tenant_id)

        # Verify exception contains conflict details
        exception = exc_info.value
        assert exception.user_id == str(valid_request_data["user_id"])
        assert len(exception.conflicts) == 1
        assert exception.conflicts[0].type == ConflictType.DEALER_UNAVAILABLE

    async def test_create_appointment_multiple_conflicts(
        self, use_case, mock_appointment_repo, valid_request_data
    ):
        """Test detection of multiple conflicts."""
        # Setup: Create multiple conflicting appointments
        conflict1 = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=datetime(2026, 5, 19, 9, 30, tzinfo=UTC),  # Overlaps
            status=AppointmentStatus.SCHEDULED,
        )

        conflict2 = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=datetime(2026, 5, 19, 10, 30, tzinfo=UTC),  # Overlaps
            status=AppointmentStatus.SCHEDULED,
        )

        mock_appointment_repo.check_conflicts.return_value = [conflict1, conflict2]

        # Execute & Verify
        request = CreateAppointmentRequest(**valid_request_data)
        tenant_id = uuid4()

        with pytest.raises(AppointmentConflictException) as exc_info:
            await use_case.execute(request, tenant_id)

        # Verify multiple conflicts detected
        exception = exc_info.value
        assert len(exception.conflicts) == 2

    async def test_create_appointment_cancelled_no_conflict(
        self, use_case, mock_appointment_repo, _mock_lead_repo, valid_request_data
    ):
        """Test that cancelled appointments don't cause conflicts."""
        # Setup: Create cancelled appointment (should not conflict)
        cancelled_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],  # Same time
            status=AppointmentStatus.CANCELLED,  # Cancelled
        )
        mock_appointment_repo.check_conflicts.return_value = [
            cancelled_appointment
        ]

        # Create mock appointment for repository response
        mock_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=valid_request_data["lead_id"],
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],
            notes=valid_request_data["notes"],
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = mock_appointment

        # Execute
        request = CreateAppointmentRequest(**valid_request_data)
        tenant_id = uuid4()

        response = await use_case.execute(request, tenant_id)

        # Verify: Should succeed despite same time (cancelled doesn't conflict)
        assert response is not None
        mock_appointment_repo.create.assert_called_once()
        # Note: update_status may or may not be called depending on lead state

    async def test_create_appointment_with_force_override(
        self, use_case, mock_appointment_repo, _mock_lead_repo, valid_request_data
    ):
        """Test that force=True overrides conflict detection."""
        # Setup: Create conflicting appointment
        conflicting_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=uuid4(),
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.check_conflicts.return_value = [
            conflicting_appointment
        ]

        # Create mock appointment for repository response
        mock_appointment = Appointment(
            id=uuid4(),
            tenant_id=uuid4(),
            lead_id=valid_request_data["lead_id"],
            user_id=valid_request_data["user_id"],
            product_id=valid_request_data["product_id"],
            scheduled_at=valid_request_data["scheduled_at"],
            notes=valid_request_data["notes"],
            status=AppointmentStatus.SCHEDULED,
        )
        mock_appointment_repo.create.return_value = mock_appointment

        # Execute with force=True
        request = CreateAppointmentRequest(
            **valid_request_data, force=True  # Force override
        )
        tenant_id = uuid4()

        response = await use_case.execute(request, tenant_id)

        # Verify: Should succeed despite conflict (force=True)
        assert response is not None
        mock_appointment_repo.create.assert_called_once()
        # Note: update_status may or may not be called depending on lead state
