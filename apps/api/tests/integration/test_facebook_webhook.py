"""Integration tests for Facebook lead webhook endpoint."""

import hashlib
import hmac
from uuid import uuid4

import pytest
from fastapi import status
from httpx import ASGITransport, AsyncClient

from prosell.infrastructure.api.main import app


@pytest.fixture
def webhook_tenant_id() -> str:
    """Tenant ID for webhook tests."""
    return str(uuid4())


@pytest.fixture
def webhook_app_secret() -> str:
    """Facebook webhook app secret for testing."""
    return "test_app_secret_123"


@pytest.fixture
async def async_client(db_session):  # noqa: ARG001
    """
    AsyncClient for webhook tests (no auth required).
    Overrides settings.facebook_app_secret for signature verification.
    """
    from unittest.mock import MagicMock

    from prosell.domain.ports.i_encryption_service import IEncryptionService
    from prosell.infrastructure.api.di import get_encryption_service
    from prosell.infrastructure.api.routers.webhook_router import get_facebook_app_secret

    # Override the get_facebook_app_secret dependency
    async def override_get_facebook_app_secret() -> str:
        return "test_app_secret_123"

    def override_get_encryption_service() -> IEncryptionService:
        svc = MagicMock(spec=IEncryptionService)
        svc.decrypt.return_value = "mock_access_token"
        return svc

    app.dependency_overrides[get_facebook_app_secret] = override_get_facebook_app_secret
    app.dependency_overrides[get_encryption_service] = override_get_encryption_service

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client

    app.dependency_overrides.clear()


def generate_hub_signature(payload_dict: dict, app_secret: str) -> str:
    """Generate X-Hub-Signature for webhook payload.

    Uses the same JSON serialization as httpx (compact, no spaces).
    """
    import json

    # httpx serializes JSON with compact separators
    payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(
        app_secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).digest()
    return f"sha256={signature.hex()}"


def get_webhook_headers(signature: str, tenant_id: str) -> dict:
    """Get standard headers for webhook requests."""
    return {
        "X-Hub-Signature": signature,
        "X-Tenant-ID": tenant_id,
    }


class TestFacebookWebhookEndpoint:
    """Test suite for POST /api/v1/webhooks/facebook endpoint."""

    async def test_webhook_returns_200_on_success(
        self,
        async_client: AsyncClient,
        webhook_app_secret: str,
        webhook_tenant_id: str,
    ):
        """Test that webhook returns 200 OK on valid request."""
        # Arrange
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "leadgen_id": "123456789",
                                "listing_id": "987654321",
                                "sender_id": "111222333",
                                "created_time": 1714560000,
                            }
                        }
                    ]
                }
            ]
        }
        signature = generate_hub_signature(payload, webhook_app_secret)

        # Act
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
            headers=get_webhook_headers(signature, webhook_tenant_id),
        )

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "received"}

    async def test_webhook_returns_403_on_missing_signature(
        self,
        async_client: AsyncClient,
    ):
        """Test that webhook returns 403 when X-Hub-Signature is missing."""
        # Arrange
        payload = {"entry": [{"changes": [{"value": {"leadgen_id": "123456789"}}]}]}

        # Act
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
        )

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Missing X-Hub-Signature" in response.json()["detail"]

    async def test_webhook_returns_403_on_invalid_signature(
        self,
        async_client: AsyncClient,
    ):
        """Test that webhook returns 403 when X-Hub-Signature is invalid."""
        # Arrange
        payload = {"entry": [{"changes": [{"value": {"leadgen_id": "123456789"}}]}]}
        invalid_signature = "sha256=invalid_signature_hash"

        # Act
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
            headers={"X-Hub-Signature": invalid_signature},
        )

        # Assert
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Invalid signature" in response.json()["detail"]

    async def test_webhook_returns_200_quickly(
        self,
        async_client: AsyncClient,
        webhook_app_secret: str,
        webhook_tenant_id: str,
    ):
        """Test that webhook returns 200 OK within 1 second (Facebook requirement)."""
        import time

        # Arrange
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "leadgen_id": "123456789",
                                "listing_id": "987654321",
                                "sender_id": "111222333",
                            }
                        }
                    ]
                }
            ]
        }
        signature = generate_hub_signature(payload, webhook_app_secret)

        # Act
        start_time = time.time()
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
            headers=get_webhook_headers(signature, webhook_tenant_id),
        )
        end_time = time.time()

        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert (end_time - start_time) < 1.0, "Webhook must respond within 1 second"

    async def test_webhook_parses_leadgen_id(
        self,
        async_client: AsyncClient,
        webhook_app_secret: str,
        webhook_tenant_id: str,
    ):
        """Test that webhook correctly parses leadgen_id from payload."""
        # Arrange
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "leadgen_id": "test_leadgen_123",
                                "listing_id": "987654321",
                                "sender_id": "111222333",
                            }
                        }
                    ]
                }
            ]
        }
        signature = generate_hub_signature(payload, webhook_app_secret)

        # Act
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
            headers=get_webhook_headers(signature, webhook_tenant_id),
        )

        # Assert
        assert response.status_code == status.HTTP_200_OK

    async def test_webhook_handles_missing_sender_id_gracefully(
        self,
        async_client: AsyncClient,
        webhook_app_secret: str,
        webhook_tenant_id: str,
    ):
        """Test that webhook handles payload without sender_id."""
        # Arrange
        payload = {
            "entry": [
                {
                    "changes": [
                        {
                            "value": {
                                "leadgen_id": "123456789",
                                "listing_id": "987654321",
                            }
                        }
                    ]
                }
            ]
        }
        signature = generate_hub_signature(payload, webhook_app_secret)

        # Act
        response = await async_client.post(
            "/api/v1/webhooks/facebook",
            json=payload,
            headers=get_webhook_headers(signature, webhook_tenant_id),
        )

        # Assert
        # Should still return 200 (webhook received), but may log error
        assert response.status_code == status.HTTP_200_OK
