"""Unit tests for EmailService."""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from prosell.infrastructure.services.email_service import (
    AbstractEmailService,
    MockEmailService,
    SendGridEmailService,
)


class TestSendGridEmailService:
    """Test SendGridEmailService implementation."""

    @pytest.fixture
    def service(self):
        """Create SendGridEmailService instance with mocked settings."""
        with patch("prosell.infrastructure.services.email_service.settings") as mock_settings:
            mock_settings.sendgrid_api_key = "test-api-key"
            mock_settings.sendgrid_from_email = "test@prosell.saas"
            mock_settings.sendgrid_from_name = "ProSell Test"
            yield SendGridEmailService()

    @pytest.mark.asyncio
    async def test_send_appointment_notification_to_dealer(self, service):
        """Test sending appointment notification to dealer."""
        # Arrange
        dealer_email = "dealer@example.com"
        dealer_name = "Juan Pérez"
        buyer_name = "María García"
        vehicle_info = "2020 Toyota Camry - $15,000"
        scheduled_at = datetime(2026, 4, 29, 14, 30)
        notes = "Client interested in financing options"

        # Mock sendgrid module and client
        with patch("builtins.__import__") as mock_import:
            # Setup mock for sendgrid import
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 202
            mock_response.body = b"OK"
            mock_sg_client.send.return_value = mock_response

            # Mock Mail class
            mock_mail_class = MagicMock
            mock_sendgrid.helpers.mail.Mail = mock_mail_class

            # Mock SendGridAPIClient
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            # Make import return our mock
            mock_import.return_value = mock_sendgrid

            # Act
            await service.send_appointment_notification(
                dealer_email=dealer_email,
                dealer_name=dealer_name,
                buyer_name=buyer_name,
                vehicle_info=vehicle_info,
                scheduled_at=scheduled_at,
                notes=notes,
            )

            # Assert
            mock_sg_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_appointment_confirmation_to_buyer(self, service):
        """Test sending appointment confirmation to buyer."""
        # Arrange
        buyer_email = "buyer@example.com"
        buyer_name = "María García"
        dealer_name = "Juan Pérez"
        vehicle_info = "2020 Toyota Camry - $15,000"
        scheduled_at = datetime(2026, 4, 29, 14, 30)
        notes = "Client interested in financing options"

        # Mock sendgrid module and client
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 202
            mock_sg_client.send.return_value = mock_response

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act
            await service.send_appointment_confirmation(
                buyer_email=buyer_email,
                buyer_name=buyer_name,
                dealer_name=dealer_name,
                vehicle_info=vehicle_info,
                scheduled_at=scheduled_at,
                notes=notes,
            )

            # Assert
            mock_sg_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_appointment_reminder(self, service):
        """Test sending appointment reminder."""
        # Arrange
        email = "reminder@example.com"
        person_type = "dealer"
        appointment_details = {
            "buyer_name": "María García",
            "dealer_name": "Juan Pérez",
            "vehicle_info": "2020 Toyota Camry - $15,000",
            "scheduled_at": datetime(2026, 4, 29, 14, 30),
            "notes": "Client interested in financing",
        }

        # Mock sendgrid module and client
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 202
            mock_sg_client.send.return_value = mock_response

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act
            await service.send_appointment_reminder(
                email=email,
                person_type=person_type,
                appointment_details=appointment_details,
            )

            # Assert
            mock_sg_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_sendgrid_error_handling(self, service):
        """Test SendGrid API error handling."""
        # Arrange
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_response.body = b"Internal Server Error"
            mock_sg_client.send.return_value = mock_response

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act & Assert
            with pytest.raises(Exception, match="SendGrid error"):
                await service.send_appointment_notification(
                    dealer_email="dealer@example.com",
                    dealer_name="Juan Pérez",
                    buyer_name="María García",
                    vehicle_info="2020 Toyota Camry",
                    scheduled_at=datetime(2026, 4, 29, 14, 30),
                    notes="Test",
                )


class TestMockEmailService:
    """Test MockEmailService implementation."""

    @pytest.fixture
    def mock_service(self):
        """Create MockEmailService instance."""
        return MockEmailService()

    @pytest.mark.asyncio
    async def test_send_appointment_notification_to_dealer(self, mock_service, capsys):
        """Test mock appointment notification to dealer."""
        # Arrange
        dealer_email = "dealer@example.com"
        dealer_name = "Juan Pérez"
        buyer_name = "María García"
        vehicle_info = "2020 Toyota Camry - $15,000"
        scheduled_at = datetime(2026, 4, 29, 14, 30)
        notes = "Client interested in financing"

        # Act
        await mock_service.send_appointment_notification(
            dealer_email=dealer_email,
            dealer_name=dealer_name,
            buyer_name=buyer_name,
            vehicle_info=vehicle_info,
            scheduled_at=scheduled_at,
            notes=notes,
        )

        # Assert
        captured = capsys.readouterr()
        assert "📧 MOCK EMAIL" in captured.out
        assert dealer_email in captured.out
        assert buyer_name in captured.out
        assert vehicle_info in captured.out

    @pytest.mark.asyncio
    async def test_send_appointment_confirmation_to_buyer(self, mock_service, capsys):
        """Test mock appointment confirmation to buyer."""
        # Arrange
        buyer_email = "buyer@example.com"
        buyer_name = "María García"
        dealer_name = "Juan Pérez"
        vehicle_info = "2020 Toyota Camry - $15,000"
        scheduled_at = datetime(2026, 4, 29, 14, 30)
        notes = "Client interested in financing"

        # Act
        await mock_service.send_appointment_confirmation(
            buyer_email=buyer_email,
            buyer_name=buyer_name,
            dealer_name=dealer_name,
            vehicle_info=vehicle_info,
            scheduled_at=scheduled_at,
            notes=notes,
        )

        # Assert
        captured = capsys.readouterr()
        assert "📧 MOCK EMAIL" in captured.out
        assert buyer_email in captured.out
        assert dealer_name in captured.out
        assert "Confirmación de Cita" in captured.out

    @pytest.mark.asyncio
    async def test_send_appointment_reminder(self, mock_service, capsys):
        """Test mock appointment reminder."""
        # Arrange
        email = "reminder@example.com"
        person_type = "dealer"
        appointment_details = {
            "buyer_name": "María García",
            "dealer_name": "Juan Pérez",
            "vehicle_info": "2020 Toyota Camry - $15,000",
            "scheduled_at": datetime(2026, 4, 29, 14, 30),
            "notes": "Test notes",
        }

        # Act
        await mock_service.send_appointment_reminder(
            email=email,
            person_type=person_type,
            appointment_details=appointment_details,
        )

        # Assert
        captured = capsys.readouterr()
        assert "📧 MOCK EMAIL" in captured.out
        assert email in captured.out
        assert "Recordatorio de Cita" in captured.out


class TestAbstractEmailService:
    """Test AbstractEmailService Protocol."""

    def test_protocol_compliance(self):
        """Test that SendGridEmailService and MockEmailService implement the protocol."""
        # AbstractEmailService is a Protocol, so we can't instantiate it
        # But we can verify that our implementations have the required methods
        assert hasattr(SendGridEmailService, "send_appointment_notification")
        assert hasattr(SendGridEmailService, "send_appointment_confirmation")
        assert hasattr(SendGridEmailService, "send_appointment_reminder")

        assert hasattr(MockEmailService, "send_appointment_notification")
        assert hasattr(MockEmailService, "send_appointment_confirmation")
        assert hasattr(MockEmailService, "send_appointment_reminder")
