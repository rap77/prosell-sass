"""Integration tests for the push subscription router - TDD RED phase.

CRM roadmap Fase 5 delivery channel.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from prosell.infrastructure.api.main import app


class TestPushRouter:
    """Tests for /api/v1/push/*."""

    @pytest.mark.asyncio
    async def test_get_vapid_public_key_returns_200(self, async_client_as_seller):
        response = await async_client_as_seller.get("/api/v1/push/vapid-public-key")

        assert response.status_code == 200
        assert "public_key" in response.json()

    @pytest.mark.asyncio
    async def test_subscribe_returns_201(self, async_client_as_seller):
        response = await async_client_as_seller.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/abc123",
                "keys": {"p256dh": "BNcRd...key", "auth": "tBHI...secret"},
            },
        )

        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_subscribe_twice_same_endpoint_does_not_error(self, async_client_as_seller):
        payload = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/repeat",
            "keys": {"p256dh": "key", "auth": "secret"},
        }

        first = await async_client_as_seller.post("/api/v1/push/subscribe", json=payload)
        second = await async_client_as_seller.post("/api/v1/push/subscribe", json=payload)

        assert first.status_code == 201
        assert second.status_code == 201

    @pytest.mark.asyncio
    async def test_unsubscribe_returns_204(self, async_client_as_seller):
        await async_client_as_seller.post(
            "/api/v1/push/subscribe",
            json={
                "endpoint": "https://fcm.googleapis.com/fcm/send/to-remove",
                "keys": {"p256dh": "key", "auth": "secret"},
            },
        )

        response = await async_client_as_seller.request(
            "DELETE",
            "/api/v1/push/subscribe",
            json={"endpoint": "https://fcm.googleapis.com/fcm/send/to-remove"},
        )

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_subscribe_requires_auth(self, db_session):  # noqa: ARG002
        app.dependency_overrides.clear()

        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.post(
                "/api/v1/push/subscribe",
                json={
                    "endpoint": "https://fcm.googleapis.com/fcm/send/anon",
                    "keys": {"p256dh": "key", "auth": "secret"},
                },
            )

        assert response.status_code in (401, 403)
