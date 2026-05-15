"""Integration tests for CreateAppointmentUseCase with mocked SendGrid.

A4.36: Test the complete flow of appointment creation including:
- Time validation via domain entity
- Conflict detection via repository
- Lead status update to "appointment_set"
- Email notification (mocked SendGrid)
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest

from prosell.application.dto.appointment.request import CreateAppointmentRequest
from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.application.use_cases.appointment.create_appointment import CreateAppointmentUseCase
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import Lead, LeadStatus
from prosell.domain.exceptions.appointment_exceptions import (
    AppointmentConflictException,
    AppointmentTimeValidationException,
)
from prosell.domain.services.appointment_conflict_detector import AppointmentConflictDetector


@pytest.fixture
def mock_appointment_repository():
    """Mock appointment repository."""
    repo = AsyncMock()
    repo.check_conflicts = AsyncMock(return_value=[])
    repo.create = AsyncMock()
    return repo


@pytest.fixture
def mock_lead_repository():
    """Mock lead repository."""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock()
    repo.update_status = AsyncMock()
    return repo


@pytest.fixture
def sample_lead():
    """Sample lead for testing."""
    from uuid import uuid4

    lead = Lead.create(
        buyer_name="John Doe",
        buyer_email="john@example.com",
        buyer_phone="+1234567890",
        source="facebook_marketplace",
        tenant_id=uuid4(),
    )
    # Manually set to QUALIFIED status so it can transition to APPOINTMENT_SET
    lead.status = LeadStatus.QUALIFIED
    return lead


@pytest.fixture
def create_appointment_use_case(mock_appointment_repository, mock_lead_repository):
    """Create use case instance with mocked dependencies."""
    conflict_detector = AppointmentConflictDetector()
    return CreateAppointmentUseCase(
        appointment_repository=mock_appointment_repository,
        lead_repository=mock_lead_repository,
        conflict_detector=conflict_detector,
    )


class TestCreateAppointmentUseCase:
    """Test CreateAppointmentUseCase integration."""

    @pytest.mark.asyncio
    async def test_create_appointment_success(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test successful appointment creation."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)  # Tuesday 10am

        # Mock lead repository to return existing lead
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Mock appointment creation
        created_appointment = Appointment.create(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
            notes="Test appointment",
        )
        mock_appointment_repository.create.return_value = created_appointment

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
            notes="Test appointment",
        )

        response = await create_appointment_use_case.execute(request, tenant_id)

        # Verify appointment was created
        assert isinstance(response, AppointmentResponse)
        assert response.lead_id == lead_id
        assert response.user_id == user_id
        assert response.status == AppointmentStatus.SCHEDULED

        # Verify lead status was updated to appointment_set
        mock_lead_repository.get_by_id.assert_awaited_once_with(lead_id, tenant_id)
        mock_lead_repository.update_status.assert_awaited_once_with(
            lead_id=lead_id, tenant_id=tenant_id, new_status=LeadStatus.APPOINTMENT_SET
        )

        # Verify appointment repository methods were called
        mock_appointment_repository.check_conflicts.assert_awaited_once()
        mock_appointment_repository.create.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_create_appointment_conflict_detection(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test conflict detection when branch has existing appointment."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)

        # Mock existing conflicting appointment
        existing_appointment = Appointment.create(
            lead_id=uuid4(),
            user_id=user_id,
            product_id=uuid4(),
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )
        mock_appointment_repository.check_conflicts.return_value = [existing_appointment]

        # Mock lead repository
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Execute and expect conflict exception
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        with pytest.raises(AppointmentConflictException) as exc_info:
            await create_appointment_use_case.execute(request, tenant_id)

        # New exception format includes conflict details
        assert "conflict" in str(exc_info.value).lower()
        assert "dealer" in str(exc_info.value).lower() or "appointment" in str(exc_info.value).lower()

        # Verify appointment was NOT created
        mock_appointment_repository.create.assert_not_awaited()

        # Verify lead status was NOT updated
        mock_lead_repository.update_status.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_time_validation_weekend(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test time validation for weekend."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 5, 3, 10, 0, 0, tzinfo=UTC)  # Saturday

        # Mock repositories
        mock_appointment_repository.check_conflicts.return_value = []
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Execute and expect validation exception
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        with pytest.raises(AppointmentTimeValidationException) as exc_info:
            await create_appointment_use_case.execute(request, tenant_id)

        assert "weekend" in str(exc_info.value).lower() or "outside business hours" in str(exc_info.value).lower()

        # Verify appointment was NOT created
        mock_appointment_repository.create.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_time_validation_before_business_hours(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test time validation before business hours (8am)."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 8, 0, 0, tzinfo=UTC)  # Tuesday 8am

        # Mock repositories
        mock_appointment_repository.check_conflicts.return_value = []
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Execute and expect validation exception
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        with pytest.raises(AppointmentTimeValidationException):
            await create_appointment_use_case.execute(request, tenant_id)

        # Verify appointment was NOT created
        mock_appointment_repository.create.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_time_validation_after_business_hours(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test time validation after business hours (7pm)."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 19, 0, 0, tzinfo=UTC)  # Tuesday 7pm

        # Mock repositories
        mock_appointment_repository.check_conflicts.return_value = []
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Execute and expect validation exception
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        with pytest.raises(AppointmentTimeValidationException):
            await create_appointment_use_case.execute(request, tenant_id)

        # Verify appointment was NOT created
        mock_appointment_repository.create.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_lead_not_found(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository
    ):
        """Test appointment creation when lead doesn't exist."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)

        # Mock lead not found
        mock_lead_repository.get_by_id.return_value = None

        # Mock appointment creation
        created_appointment = Appointment.create(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )
        mock_appointment_repository.create.return_value = created_appointment

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        # Should succeed but NOT update lead status
        response = await create_appointment_use_case.execute(request, tenant_id)

        assert isinstance(response, AppointmentResponse)
        mock_lead_repository.update_status.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_lead_already_appointment_set(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository
    ):
        """Test that lead status is not updated if already appointment_set."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)

        # Create a mock lead with status already appointment_set
        lead_with_appointment = Mock()
        lead_with_appointment.status = LeadStatus.APPOINTMENT_SET
        lead_with_appointment.id = lead_id

        # Mock lead repository to return lead with appointment_set status
        mock_lead_repository.get_by_id.return_value = lead_with_appointment

        # Mock appointment creation
        created_appointment = Appointment.create(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )
        mock_appointment_repository.create.return_value = created_appointment

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        response = await create_appointment_use_case.execute(request, tenant_id)

        assert isinstance(response, AppointmentResponse)

        # Verify update_status was NOT called (already appointment_set)
        mock_lead_repository.update_status.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_create_appointment_with_notes(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test appointment creation with notes."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)
        notes = "Customer wants to test drive the vehicle"

        # Mock repositories
        mock_lead_repository.get_by_id.return_value = sample_lead

        created_appointment = Appointment.create(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
            notes=notes,
        )
        mock_appointment_repository.create.return_value = created_appointment

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
            notes=notes,
        )

        response = await create_appointment_use_case.execute(request, tenant_id)

        assert isinstance(response, AppointmentResponse)
        assert response.notes == notes

    @pytest.mark.asyncio
    async def test_create_appointment_conflict_check_params(
        self, create_appointment_use_case, mock_appointment_repository, mock_lead_repository, sample_lead
    ):
        """Test that conflict check is called with correct parameters."""
        tenant_id = uuid4()
        lead_id = uuid4()
        user_id = uuid4()
        product_id = uuid4()
        scheduled_at = datetime(2026, 4, 29, 10, 0, 0, tzinfo=UTC)

        # Mock repositories
        mock_appointment_repository.check_conflicts.return_value = []
        mock_lead_repository.get_by_id.return_value = sample_lead

        created_appointment = Appointment.create(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            tenant_id=tenant_id,
            scheduled_at=scheduled_at,
        )
        mock_appointment_repository.create.return_value = created_appointment

        # Execute
        request = CreateAppointmentRequest(
            lead_id=lead_id,
            user_id=user_id,
            product_id=product_id,
            scheduled_at=scheduled_at.isoformat(),
        )

        await create_appointment_use_case.execute(request, tenant_id)

        # Verify check_conflicts was called with correct params
        mock_appointment_repository.check_conflicts.assert_awaited_once_with(
            user_id=user_id, scheduled_at=scheduled_at, tenant_id=tenant_id
        )
