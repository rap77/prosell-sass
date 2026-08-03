"""Integration tests for Facebook account management endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_accounts_accepts_cookie_authenticated_user(
    async_client_as_admin: AsyncClient,
) -> None:
    """Cookie-authenticated users can list their tenant's Facebook accounts."""
    response = await async_client_as_admin.get("/api/v1/fb-accounts")

    assert response.status_code == 200, response.text
    assert isinstance(response.json(), list)
