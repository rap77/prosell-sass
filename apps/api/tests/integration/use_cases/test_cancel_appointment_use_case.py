"""Integration tests for CancelAppointmentUseCase with mocked email service.

Tests the complete flow of appointment cancellation including:
- Status update to CANCELLED
- Email notification to buyer (mocked via the AbstractEmailService port)
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from prosell.application.dto.appointment.response import AppointmentResponse
from prosell.application.use_cases.appointment.cancel_appointment import CancelAppointmentUseCase
from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import Lead
from prosell.domain.exceptions.appointment_exceptions import AppointmentNotFoundException


@pytest.fixture
def mock_appointment_repository() -> AsyncMock:
    """Mock appointment repository."""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock()
    repo.update_status = AsyncMock()
    return repo


@pytest.fixture
def mock_lead_repository() -> AsyncMock:
    """Mock lead repository."""
    repo = AsyncMock()
    repo.get_by_id = AsyncMock()
    return repo


@pytest.fixture
def mock_email_service() -> AsyncMock:
    """Mock email service."""
    service = AsyncMock()
    service.send_appointment_status_update = AsyncMock()
    return service


@pytest.fixture
def sample_appointment() -> Appointment:
    """Sample scheduled appointment."""
    return Appointment.create(
        lead_id=uuid4(),
        user_id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        scheduled_at=datetime(2026, 5, 15, 14, 0, 0, tzinfo=UTC),
        notes="Test appointment",
    )


@pytest.fixture
def sample_lead() -> Lead:
    """Sample lead with email."""
    return Lead.create(
        buyer_name="John Doe",
        buyer_email="john@example.com",
        buyer_phone="+1234567890",
        tenant_id=uuid4(),
    )


@pytest.fixture
def mock_user_repository() -> AsyncMock:
    """Mock user repository."""
    from prosell.domain.entities.user import User, UserStatus

    repo = AsyncMock()
    user = User(
        id=uuid4(),
        email="asesor@prosell.io",
        full_name="Carlos Asesor",
        tenant_id=uuid4(),
        status=UserStatus.ACTIVE,
        email_verified=True,
        roles=[],
    )
    repo.get_by_id = AsyncMock(return_value=user)
    return repo


@pytest.fixture
def mock_product_repository() -> AsyncMock:
    """Mock product repository."""
    repo = AsyncMock()
    product = AsyncMock()
    product.title = "2022 Toyota Corolla"
    repo.get_by_id = AsyncMock(return_value=product)
    return repo


@pytest.fixture
def cancel_appointment_use_case(
    mock_appointment_repository: AsyncMock,
    mock_lead_repository: AsyncMock,
    mock_email_service: AsyncMock,
    mock_user_repository: AsyncMock,
    mock_product_repository: AsyncMock,
) -> CancelAppointmentUseCase:
    """Create use case instance with mocked dependencies."""
    return CancelAppointmentUseCase(
        appointment_repository=mock_appointment_repository,
        lead_repository=mock_lead_repository,
        email_service=mock_email_service,
        user_repository=mock_user_repository,
        product_repository=mock_product_repository,
    )


class TestCancelAppointmentUseCase:
    """Test CancelAppointmentUseCase integration."""

    @pytest.mark.asyncio
    async def test_cancel_appointment_success(
        self,
        cancel_appointment_use_case: CancelAppointmentUseCase,
        mock_appointment_repository: AsyncMock,
        mock_lead_repository: AsyncMock,
        mock_email_service: AsyncMock,
        sample_appointment: Appointment,
        sample_lead: Lead,
    ) -> None:
        """Test successful appointment cancellation."""
        tenant_id = uuid4()
        appointment_id = sample_appointment.id

        # Mock appointment repository to return existing appointment
        mock_appointment_repository.get_by_id.return_value = sample_appointment

        # Mock lead repository to return lead
        mock_lead_repository.get_by_id.return_value = sample_lead

        # Mock status update to return cancelled appointment
        cancelled_appointment = Appointment(
            id=sample_appointment.id,
            tenant_id=sample_appointment.tenant_id,
            lead_id=sample_appointment.lead_id,
            user_id=sample_appointment.user_id,
            product_id=sample_appointment.product_id,
            scheduled_at=sample_appointment.scheduled_at,
            status=AppointmentStatus.CANCELLED,
            notes=sample_appointment.notes,
            created_at=sample_appointment.created_at,
            updated_at=datetime.now(UTC),
        )
        mock_appointment_repository.update_status.return_value = cancelled_appointment

        # Execute
        response = await cancel_appointment_use_case.execute(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
        )

        # Verify response
        assert isinstance(response, AppointmentResponse)
        assert response.status == AppointmentStatus.CANCELLED

        # Verify appointment status was updated
        mock_appointment_repository.update_status.assert_awaited_once_with(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
            new_status=AppointmentStatus.CANCELLED,
        )

        # Verify email was sent to buyer
        mock_email_service.send_appointment_status_update.assert_awaited_once()
        call_args = mock_email_service.send_appointment_status_update.call_args
        assert call_args[1]["buyer_email"] == sample_lead.buyer_email
        assert call_args[1]["buyer_name"] == sample_lead.buyer_name
        assert call_args[1]["new_status"] == AppointmentStatus.CANCELLED
        assert call_args[1]["branch_name"] == "Carlos Asesor"
        assert call_args[1]["vehicle_info"] == "2022 Toyota Corolla"

    @pytest.mark.asyncio
    async def test_cancel_appointment_not_found(
        self,
        cancel_appointment_use_case: CancelAppointmentUseCase,
        mock_appointment_repository: AsyncMock,
        mock_email_service: AsyncMock,
    ) -> None:
        """Test cancellation when appointment doesn't exist."""
        tenant_id = uuid4()
        appointment_id = uuid4()

        # Mock appointment not found
        mock_appointment_repository.get_by_id.return_value = None

        # Execute and expect exception
        with pytest.raises(AppointmentNotFoundException):
            await cancel_appointment_use_case.execute(
                appointment_id=appointment_id,
                tenant_id=tenant_id,
            )

        # Verify the injected email service was NOT called
        mock_email_service.send_appointment_status_update.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_cancel_appointment_lead_not_found(
        self,
        cancel_appointment_use_case: CancelAppointmentUseCase,
        mock_appointment_repository: AsyncMock,
        mock_lead_repository: AsyncMock,
        mock_email_service: AsyncMock,
        sample_appointment: Appointment,
    ) -> None:
        """Test cancellation when lead doesn't exist (edge case)."""
        tenant_id = uuid4()
        appointment_id = sample_appointment.id

        # Mock appointment repository to return appointment
        mock_appointment_repository.get_by_id.return_value = sample_appointment

        # Mock lead not found
        mock_lead_repository.get_by_id.return_value = None

        # Mock status update
        cancelled_appointment = Appointment(
            id=sample_appointment.id,
            tenant_id=sample_appointment.tenant_id,
            lead_id=sample_appointment.lead_id,
            user_id=sample_appointment.user_id,
            product_id=sample_appointment.product_id,
            scheduled_at=sample_appointment.scheduled_at,
            status=AppointmentStatus.CANCELLED,
            notes=sample_appointment.notes,
            created_at=sample_appointment.created_at,
            updated_at=datetime.now(UTC),
        )
        mock_appointment_repository.update_status.return_value = cancelled_appointment

        # Execute - should succeed but NOT send email (no lead)
        response = await cancel_appointment_use_case.execute(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
        )

        # Verify appointment was still cancelled
        assert response.status == AppointmentStatus.CANCELLED

        # Verify email was NOT sent (no lead to email)
        mock_lead_repository.get_by_id.assert_awaited_once()
        mock_email_service.send_appointment_status_update.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_cancel_appointment_lead_without_email(
        self,
        cancel_appointment_use_case: CancelAppointmentUseCase,
        mock_appointment_repository: AsyncMock,
        mock_lead_repository: AsyncMock,
        mock_email_service: AsyncMock,
        sample_appointment: Appointment,
    ) -> None:
        """Test cancellation when lead has no email (edge case)."""
        tenant_id = uuid4()
        appointment_id = sample_appointment.id

        # Mock appointment repository to return appointment
        mock_appointment_repository.get_by_id.return_value = sample_appointment

        # Mock lead without email
        lead_no_email = Lead.create(
            buyer_name="Jane Doe",
            buyer_email=None,  # No email
            buyer_phone="+1234567890",
            tenant_id=tenant_id,
        )
        mock_lead_repository.get_by_id.return_value = lead_no_email

        # Mock status update
        cancelled_appointment = Appointment(
            id=sample_appointment.id,
            tenant_id=sample_appointment.tenant_id,
            lead_id=sample_appointment.lead_id,
            user_id=sample_appointment.user_id,
            product_id=sample_appointment.product_id,
            scheduled_at=sample_appointment.scheduled_at,
            status=AppointmentStatus.CANCELLED,
            notes=sample_appointment.notes,
            created_at=sample_appointment.created_at,
            updated_at=datetime.now(UTC),
        )
        mock_appointment_repository.update_status.return_value = cancelled_appointment

        # Execute - should succeed but NOT send email (no email address)
        response = await cancel_appointment_use_case.execute(
            appointment_id=appointment_id,
            tenant_id=tenant_id,
        )

        # Verify appointment was cancelled
        assert response.status == AppointmentStatus.CANCELLED

        # Email service should NOT be called when lead has no email
        mock_email_service.send_appointment_status_update.assert_not_awaited()
