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


class TestSendGridRetryLogic:
    """Test SendGrid retry logic with exponential backoff."""

    @pytest.fixture
    def service(self):
        """Create SendGridEmailService instance with mocked settings."""
        with patch("prosell.infrastructure.services.email_service.settings") as mock_settings:
            mock_settings.sendgrid_api_key = "test-api-key"
            mock_settings.sendgrid_from_email = "test@prosell.saas"
            mock_settings.sendgrid_from_name = "ProSell Test"
            yield SendGridEmailService()

    @pytest.mark.asyncio
    async def test_retry_on_500_error(self, service):
        """Test that service retries on 500 error."""
        # Arrange
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()

            # First two calls fail with 500, third succeeds
            mock_response_fail = MagicMock()
            mock_response_fail.status_code = 500
            mock_response_fail.body = b"Internal Server Error"

            mock_response_success = MagicMock()
            mock_response_success.status_code = 202
            mock_response_success.body = b"OK"

            mock_sg_client.send.side_effect = [
                mock_response_fail,
                mock_response_fail,
                mock_response_success,
            ]

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act
            await service.send_appointment_notification(
                dealer_email="dealer@example.com",
                dealer_name="Juan Pérez",
                buyer_name="María García",
                vehicle_info="2020 Toyota Camry",
                scheduled_at=datetime(2026, 4, 29, 14, 30),
                notes="Test",
            )

            # Assert - should have been called 3 times (2 failures + 1 success)
            assert mock_sg_client.send.call_count == 3

    @pytest.mark.asyncio
    async def test_retry_on_502_error(self, service):
        """Test that service retries on 502 Bad Gateway error."""
        # Arrange
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()

            # First call fails with 502, second succeeds
            mock_response_502 = MagicMock()
            mock_response_502.status_code = 502
            mock_response_502.body = b"Bad Gateway"

            mock_response_success = MagicMock()
            mock_response_success.status_code = 202
            mock_response_success.body = b"OK"

            mock_sg_client.send.side_effect = [mock_response_502, mock_response_success]

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act
            await service.send_appointment_confirmation(
                buyer_email="buyer@example.com",
                buyer_name="María García",
                dealer_name="Juan Pérez",
                vehicle_info="2020 Toyota Camry",
                scheduled_at=datetime(2026, 4, 29, 14, 30),
            )

            # Assert - should have been called 2 times
            assert mock_sg_client.send.call_count == 2

    @pytest.mark.asyncio
    async def test_no_retry_on_400_error(self, service):
        """Test that service does NOT retry on 400 client error."""
        # Arrange
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()

            mock_response = MagicMock()
            mock_response.status_code = 400
            mock_response.body = b"Bad Request"

            mock_sg_client.send.return_value = mock_response

            mock_sendgrid.helpers.mail.Mail = MagicMock
            mock_sendgrid.SendGridAPIClient.return_value = mock_sg_client

            mock_import.return_value = mock_sendgrid

            # Act & Assert
            with pytest.raises(Exception, match="SendGrid error"):
                await service.send_appointment_reminder(
                    email="test@example.com",
                    person_type="dealer",
                    appointment_details={
                        "buyer_name": "Test",
                        "dealer_name": "Test",
                        "vehicle_info": "Test",
                        "scheduled_at": datetime(2026, 4, 29, 14, 30),
                    },
                )

            # Assert - should have been called only once (no retry on 400)
            assert mock_sg_client.send.call_count == 1

    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self, service):
        """Test that service raises exception after max retries."""
        # Arrange
        with patch("builtins.__import__") as mock_import:
            mock_sendgrid = MagicMock()
            mock_sg_client = AsyncMock()

            # All calls fail with 503
            mock_response = MagicMock()
            mock_response.status_code = 503
            mock_response.body = b"Service Unavailable"

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

            # Assert - should have been called 4 times (1 initial + 3 retries)
            assert mock_sg_client.send.call_count == 4
