"""Tests for appointment status update email notifications."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import pytest

from prosell.domain.entities.appointment import Appointment, AppointmentStatus
from prosell.domain.entities.lead import Lead
from prosell.infrastructure.services.email_service import SendGridEmailService


@pytest.fixture
def sendgrid_service():
    """Create SendGridEmailService instance."""
    return SendGridEmailService()


@pytest.fixture
def sample_appointment():
    """Create sample appointment."""
    return Appointment.create(
        lead_id=uuid4(),
        user_id=uuid4(),
        product_id=uuid4(),
        tenant_id=uuid4(),
        scheduled_at=datetime(2026, 5, 15, 14, 0, 0, tzinfo=UTC),
        notes="Test appointment",
    )


@pytest.fixture
def sample_lead():
    """Create sample lead."""
    return Lead.create(
        buyer_name="John Doe",
        buyer_email="john@example.com",
        buyer_phone="+1234567890",
        tenant_id=uuid4(),
    )


@pytest.fixture
def sample_branch():
    """Create sample branch user info."""
    return {
        "name": "Jane Smith",
        "email": "jane@branch.com",
    }


@pytest.fixture
def sample_vehicle():
    """Create sample vehicle info."""
    return "2023 Toyota Camry SE - Silver"


class TestSendAppointmentStatusEmails:
    """Test appointment status update emails."""

    @pytest.mark.asyncio
    async def test_send_appointment_confirmed_email(
        self, sendgrid_service, sample_appointment, sample_lead, sample_branch, sample_vehicle
    ):
        """Test sending appointment confirmed email to buyer."""
        with patch("sendgrid.SendGridAPIClient") as mock_sg:
            # Mock SendGrid client
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.send.return_value = mock_response
            mock_sg.return_value = mock_client

            # Execute
            await sendgrid_service.send_appointment_status_update(
                buyer_email=sample_lead.buyer_email,
                buyer_name=sample_lead.buyer_name,
                branch_name=sample_branch["name"],
                vehicle_info=sample_vehicle,
                scheduled_at=sample_appointment.scheduled_at,
                new_status=AppointmentStatus.COMPLETED,
                notes=sample_appointment.notes,
            )

            # Verify SendGrid was called
            mock_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_appointment_cancelled_email(
        self, sendgrid_service, sample_appointment, sample_lead, sample_branch, sample_vehicle
    ):
        """Test sending appointment cancelled email to buyer."""
        with patch("sendgrid.SendGridAPIClient") as mock_sg:
            # Mock SendGrid client
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.send.return_value = mock_response
            mock_sg.return_value = mock_client

            # Execute
            await sendgrid_service.send_appointment_status_update(
                buyer_email=sample_lead.buyer_email,
                buyer_name=sample_lead.buyer_name,
                branch_name=sample_branch["name"],
                vehicle_info=sample_vehicle,
                scheduled_at=sample_appointment.scheduled_at,
                new_status=AppointmentStatus.CANCELLED,
                notes=sample_appointment.notes,
            )

            # Verify SendGrid was called
            mock_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_appointment_status_without_notes(
        self, sendgrid_service, sample_appointment, sample_lead, sample_branch, sample_vehicle
    ):
        """Test sending appointment status email without notes."""
        with patch("sendgrid.SendGridAPIClient") as mock_sg:
            # Mock SendGrid client
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 202
            mock_client.send.return_value = mock_response
            mock_sg.return_value = mock_client

            # Execute without notes
            await sendgrid_service.send_appointment_status_update(
                buyer_email=sample_lead.buyer_email,
                buyer_name=sample_lead.buyer_name,
                branch_name=sample_branch["name"],
                vehicle_info=sample_vehicle,
                scheduled_at=sample_appointment.scheduled_at,
                new_status=AppointmentStatus.COMPLETED,
                notes=None,
            )

            # Verify SendGrid was called
            mock_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_appointment_status_sendgrid_error(
        self, sendgrid_service, sample_appointment, sample_lead, sample_branch, sample_vehicle
    ):
        """Test handling SendGrid API error."""
        with patch("sendgrid.SendGridAPIClient") as mock_sg:
            # Mock SendGrid client to raise error
            mock_client = AsyncMock()
            mock_client.send.side_effect = Exception("SendGrid API Error: 500")
            mock_sg.return_value = mock_client

            # Execute and expect exception
            with pytest.raises(Exception) as exc_info:
                await sendgrid_service.send_appointment_status_update(
                    buyer_email=sample_lead.buyer_email,
                    buyer_name=sample_lead.buyer_name,
                    branch_name=sample_branch["name"],
                    vehicle_info=sample_vehicle,
                    scheduled_at=sample_appointment.scheduled_at,
                    new_status=AppointmentStatus.COMPLETED,
                    notes=sample_appointment.notes,
                )

            assert "SendGrid API Error" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_mock_email_service_status_update(
        self, sample_appointment, sample_lead, sample_branch, sample_vehicle
    ):
        """Test MockEmailService status update (logs to console)."""
        from prosell.infrastructure.services.email_service import MockEmailService

        mock_service = MockEmailService()

        # This should not raise an exception
        await mock_service.send_appointment_status_update(
            buyer_email=sample_lead.buyer_email,
            buyer_name=sample_lead.buyer_name,
            branch_name=sample_branch["name"],
            vehicle_info=sample_vehicle,
            scheduled_at=sample_appointment.scheduled_at,
            new_status=AppointmentStatus.CANCELLED,
            notes=sample_appointment.notes,
        )

        # If we get here without exception, test passes
        # The mock service just prints to console
